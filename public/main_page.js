import { db } from "./script.js"
        // Simple animation for chart segments
        document.addEventListener('DOMContentLoaded', function() {
            const paths = document.querySelectorAll('.chart-container path');
            
            paths.forEach((path, index) => {
                // Delay animation for each segment
                setTimeout(() => {
                    path.style.transition = 'all 0.5s ease-out';
                    path.style.transform = 'scale(1.05)';
                    
                    setTimeout(() => {
                        path.style.transform = 'scale(1)';
                    }, 300);
                }, index * 200);
            });
        });

function fetchUserName() {
    console.log("in fetchUserName");
    const userId = sessionStorage.getItem("billsplitter_users");  
    console.log("userId: ", userId);
    db.collection("billsplitter_users").doc(userId).get()
    .then((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            const userName = userData.Name;  // Fetching the 'Name' field from Firestore

            // Update the profile name on your page
            document.getElementById("profile-name").innerText = userName;
        } else {
            console.error("No such document!");
        }
    })
    .catch((error) => {
        console.error("Error getting document:", error);
    });
}
fetchUserName();