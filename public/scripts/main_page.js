
console.log("Script loaded and running.");  // Place this line at the top of your script


const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();


const currentUser = JSON.parse(localStorage.getItem("currentUser"));


async function fetchUserName() {
    console.log("in fetchUserName");  

    if (currentUser) {
        // Display the user name from the stored data
        const userName = currentUser.data.Name;
        const userBalance = currentUser.data.Balance;
        
        document.querySelector(".profile-name").innerText = `${userName}`; 
        document.querySelector(".user-balance").innerHTML = `${userBalance}`;



        const userSnapshot = await db.collection("billsplitter_users").where("Name", "==", userName).get();


        const billsSnapshot = await userSnapshot.docs[0].ref.collection("Request").get();

        const id = billsSnapshot.docs[0].data().billId;

        const billRef = db.collection("Bills").doc(id);
        const billSnap = await billRef.get();
        if (billSnap.exists) {
            console.log("Found!");
        } else {
            console.log("None");
        }

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




// function payCurrentBill(billData) {

//     const billInitiater = billData.name;
//     const billDescription = billData.description;
//     const billDate = billData.date;
//     const billCategory = billData.category;
//     document.getElementById("dashboard-grid").innerHTML = billDescription;
// }



function payCurrentBill(bill) {
    const container = document.getElementById("container");

    // Generate dynamic content for amount status
    const yourAmount = bill.AmountStatus[currentUser.data.Name][0];
    
    const amountStatusHtml = Object.entries(bill.AmountStatus || {}).map(([name, [amount, paid]]) => {

        if (name == currentUser.data.Name) {
            name = "You";
        }

        const payStatus = 1 ? "paid-green" : "paid-red";
        return `
        <div style="margin-left: 20px;">
            <p><strong>${name}</strong></p>
            <p style="font-weight: bold;">Amount: $${amount}</p>
            <p class = "pay-status ${payStatus}">${paid ? "Paid" : "Unpaid"}</p>
        </div>
    `}).join("");

    // Replace #dashboard content
    container.innerHTML = `
        <div class="bill-detail-card">
        <h2>Bill Details</h2>
        <p><strong>Description:</strong> ${bill.description}</p>
        <p><strong>Date:</strong> ${bill.date}</p>
        <p><strong>Category:</strong> ${bill.category}</p>
        <p><strong>Total Amount:</strong> $${bill.amount}</p>
        <p><strong>Created by:</strong> ${bill.name}</p>

        

        <div class="detail-section">
            <h3>Amount Status</h3>
            ${amountStatusHtml}
        </div>


        <div class="detail-section">
            

            <div class="paid-amount">$${yourAmount.toFixed(2)}</div>
            
        </div>

        <button id="confirm-pay-btn">Confirm Pay</button>
        <button id="cancel-pay-btn">Cancel</button>
        </div>
    `;

    // Set up the Confirm Pay button listener
    document.getElementById("confirm-pay-btn").addEventListener("click", () => {
        confirmPayment(bill);
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

    let i = 1;

    if (!billsSnapshot.empty) {
        
         billsSnapshot.forEach(async doc => { /// loop body
            
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

                    const billAmount = billData.AmountStatus[currentUser.data.Name][0];
                    

                    let curEntryHtml =
                    `<div class="bill-entry" id = "bill-entry-${i}">
                                <div class="bill-info">
                                    <div class="bill-description">${billDescription}</div>
                                    <div class="bill-meta">
                                        <span class="bill-date">${billDate}</span>
                                        <span class="bill-category">${billCategory}</span>
                                        <span class = "bill-initializer">Created by: ${billInitiater}</span>
                                    </div>
                                </div>
                                <div class="bill-amount">$${billAmount.toFixed(2)}</div>
                    </div>`;


                    billMenu.insertAdjacentHTML('beforeend', curEntryHtml);

                    const button = document.createElement("button");
                    button.className = "btn";
                    button.innerText = "Pay";

                    button.addEventListener("click", ()=> {
                        
                        console.log("hello");

                        payCurrentBill(billData);
                    })

                    const buttonWrapper = document.createElement("div");
                    buttonWrapper.appendChild(button);
                    document.getElementById(`bill-entry-${i}`).appendChild(buttonWrapper);
                    i += 1;
                    console.log(curEntryHtml);
                } else {
                    console.log("TODO: if the bill is closed");
                }
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
