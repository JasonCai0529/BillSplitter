
console.log("Script loaded and running.");  // Place this line at the top of your script


const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();


const currentUser = JSON.parse(localStorage.getItem("currentUser"));


async function fetchUserName() {
    console.log("in fetchUserName");  


   
    
    // console.log(db);

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



        const userSnapshot = await db.collection("billsplitter_users").where("Name", "==", userName).get();


        const billsSnapshot = await userSnapshot.docs[0].ref.collection("Request").get();

        console.log(userSnapshot);
        const id = billsSnapshot.docs[0].data().billId;
        console.log(id);

        const billRef = db.collection("Bills").doc(id);
        const billSnap = await billRef.get();
        if (billSnap.exists) {
            console.log("Found!");
        } else {
            console.log("None");
        }
        console.log(billSnap);
        console.log(billSnap.data());

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




// bill entry html structure

/*
<div class="bill-entry">
                                <div class="bill-info">
                                    <div class="bill-description">Dinner at Italian Restaurant</div>
                                    <div class="bill-meta">
                                        <span class="bill-date">2025-06-03</span>
                                        <span class="bill-category">Restaurant</span>
                                        <span class = "bill-initializer">Created by: Jason</span>
                                    </div>
                                </div>
                                <div class="bill-amount">$45.00</div>
</div>
*/

async function loadBills() {

    const userName = currentUser.data.Name;

    const userSnapshot = await db.collection("billsplitter_users").where("Name", "==", userName).get();

    const billsSnapshot = await userSnapshot.docs[0].ref.collection("Request").get();

    const billMenu = document.getElementById("bill-scroll-menu");
    
    if (!billsSnapshot.empty) {
        billMenu.innerHTML = "";
    }

    if (!billsSnapshot.empty) {
        
         billsSnapshot.forEach(async doc => {
            
            // retrive the Bill id from current Users's "Bills" collection
            const curId = doc.data().billId;
            // fetch the actual bill from the universal "Bills" collection
            const billRef = db.collection("Bills").doc(curId);
            const billSnap = await billRef.get();


            if (billSnap.exists) { // if can found such snapshot
                const billData = billSnap.data();
                
                if (billData.State == "open") { // only do stuff when the bill is still open
                    console.log("billSnap id: " + billRef.id);
                    const billInitiater = billData.name;
                    const billDescription = billData.description;
                    const billDate = billData.date;
                    const billCategory = billData.category;
                    

                    let curEntryHtml =
                    `<div class="bill-entry">
                                <div class="bill-info">
                                    <div class="bill-description">${billDescription}</div>
                                    <div class="bill-meta">
                                        <span class="bill-date">${billDate}</span>
                                        <span class="bill-category">${billCategory}</span>
                                        <span class = "bill-initializer">Created by: ${billInitiater}</span>
                                    </div>
                                </div>
                                <div class="bill-amount">$45.00</div>
                    </div>`;

                    billMenu.innerHTML += curEntryHtml;

                    console.log("Number of entries:", billMenu.querySelectorAll('.bill-entry').length);

                    console.log(curEntryHtml);
                } else {
                    console.log("TODO: if the bill is closed");
                }


                console.log("aldksfhaksdfhaslkd");
                console.log(billData.Participants[0]);
            } else {
                console.log("Cannot find the bill information");
            }

        });
    }



}

document.addEventListener('DOMContentLoaded', function() {
    fetchUserName();
    animateChartSegments();
    loadBills();
});
