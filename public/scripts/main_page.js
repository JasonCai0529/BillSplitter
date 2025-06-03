
console.log("Script loaded and running.");  // Place this line at the top of your script


function fetchUserName() {
    console.log("in fetchUserName");  
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (currentUser) {
        console.log("User ID:", currentUser.id);
        console.log("User Data:", currentUser.data); 
        // Display the user name from the stored data
        const userName = currentUser.data.Name;
        const userBalance = currentUser.data.Balance;
        console.log("userBalance:", userBalance); 
        console.log("userName:", userName); 
        document.querySelector(".profile-name").innerText = `${userName}`; 
        document.querySelector(".user-balance").innerHTML = `${userBalance}`;
    } else {
        console.log("No user is currently logged in.");
        alert("Please log in first.");
        window.location.href = "index.html"; // Redirect to login page if no user is found
    }
}

function animateChartSegments() {
    const paths = document.querySelectorAll('.chart-container path');
    paths.forEach((path, index) => {
        setTimeout(() => {
            path.style.transition = 'all 0.5s ease-out';
            path.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                path.style.transform = 'scale(1)';
            }, 300);
        }, index * 200);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    fetchUserName();
    animateChartSegments();
});
