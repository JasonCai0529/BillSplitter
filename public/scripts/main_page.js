const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();


/**


clear all user's data

 */


const categoryCode = {
    "restaurant": 0,
    "grocery": 1,
    "personal": 2,
    "gas": 3,
    "other": 4
}


const currentUser = JSON.parse(localStorage.getItem("currentUser"));


async function fetchUserName() {
    console.log("in fetchUserName");  

    if (currentUser) {
        // Display the user name from the stored data
        const userName = currentUser.data.Name;
        const userSnapshot = await db.collection("billsplitter_users").where("Name", "==", userName).get();
        if (userSnapshot.empty) {
            console.alert("cannot find such user in fetchUserName");
        }

        const userData = userSnapshot.docs[0].data();
        const userBalance = userData.Balance;
        
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



function showPaymentSuccess() {
    const successMessage = '<div class="detail-section success-message">Successfully paid!  Redirecting...</div>'
    document.getElementById("bill-detail-card").insertAdjacentHTML("beforeend", successMessage);

    // remove the two buttons


    setTimeout(() => {
        window.location.href = "main_page.html";
    }, 2500);
}


async function confirmPayment(bill, id) {
    /**
     update bill info
     update cur user's balance
     update receipent's balance
     update spending's array -> [1, 2, 3, 4]
     */

     console.log(id);


    //  const ownerSnapshot = await db.collection("billsplitter_users")
    //         .where("Name", "==", name).get();
        

    //     if (!ownerSnapshot.empty) {
    //         const ownerDoc = ownerSnapshot.docs[0];
    //         const ownerRef = ownerDoc.ref;

    //         if (billId) {
    //             ownerRef.collection("Request").add({billId});
    //         }
    //     }


    // const billData = {
    //     "name":name,
    //     "description":description,
    //     "category":category,
    //     "date":date,
    //     "amount":amount.toFixed(2),
    //     "Participants":selectedParticipants,
    //     "AmountStatus": status,
    //     "State": 'open'
    // };


    const payerName = currentUser.data.Name;
    const initiaterName = bill.name;

    const payerSnapshot = await db.collection("billsplitter_users").where("Name", "==", payerName).get();
    const payerAmount = bill.AmountStatus[payerName][0];

    let payerAmountStatus = bill.AmountStatus;

    payerAmountStatus[payerName][1] = true;

    // updateBill
    let updateBillAmount = bill.amount - payerAmount;
    const updateBillState = updateBillAmount == 0 ? "close" : "open";
    
    await db.collection("Bills").doc(id).update({
        State: updateBillState,
        amount: updateBillAmount,
        AmountStatus: payerAmountStatus
    });


    
    if (!payerSnapshot.empty) {

        const payerData = payerSnapshot.docs[0].data();
        console.log(payerData.Balance);

        let payerBalance = payerData.Balance;
        let payerSpendings = payerData.Spendings;
        

        if (payerSpendings == undefined) {
            payerSpendings = new Array(5).fill(0);
        }

        payerSpendings[categoryCode[bill.category]] += payerAmount;

        payerBalance -= payerAmount;
        // if (payerName == initiaterName) { // if is paying a bill of a person itself
        //     payerBalance += payerAmount;
        // }
        console.log(categoryCode[bill.category]);
        console.log(payerSpendings, payerBalance);

        const payerDoc = payerSnapshot.docs[0];
        const payerRef = payerDoc.ref;

        await payerRef.update({
            Balance: payerBalance,
            Spendings: payerSpendings,
        });
    }

    if (payerName == initiaterName) {
        console.log("returning from ConfirmPayment....");
        showPaymentSuccess();
        return;
    }


    const initiaterSnapshot = await db.collection("billsplitter_users").where("Name", "==", initiaterName).get();
    if (!initiaterSnapshot.empty) { // add amount to bill owner's balance
        const initiaterData = initiaterSnapshot.docs[0].data();
        console.log(initiaterData.name);

        let initiaterBalance = initiaterData.Balance;

        const initiaterDoc = initiaterSnapshot.docs[0];
        const initiaterRef = initiaterDoc.ref;

        await initiaterRef.update({
            Balance: initiaterBalance
        });
    }

    showPaymentSuccess();


}



function payCurrentBill(bill, id) {
    const container = document.getElementById("container");
    
    

    // Generate dynamic content for amount status
    const yourAmount = bill.AmountStatus[currentUser.data.Name][0];
    
    const amountStatusHtml = Object.entries(bill.AmountStatus || {}).map(([name, [amount, paid]]) => {

        if (name == currentUser.data.Name) {
            name = "You";
        }

        const payStatus = paid ? "paid-green" : "paid-red";
        return `
        <div style="margin-left: 0px;" class = "single-status">
            <p style="margin-bottom: 5px; color: var(--primary-dark);"><strong>${name}</strong></p>
            <p style="font-weight: 300;">$${amount}</p>
            <p class = "pay-status ${payStatus}">${paid ? "Paid" : "Unpaid"}</p>
        </div>
    `}).join("");

    // Replace #dashboard content
    container.innerHTML = `
        <div class="bill-detail-card" id="bill-detail-card">
        <h2>Bill Details</h2>
        <p><strong>Description:</strong> ${bill.description}</p>
        <p><strong>Date:</strong> ${bill.date}</p>
        <p><strong>Category:</strong> ${bill.category}</p>
        <p><strong>Total Amount:</strong> $${bill.amount}</p>
        <p><strong>Created by:</strong> ${bill.name}</p>

        

        <div class="detail-section">
            <h2>Payers</h2>
            <div class = "status-row">${amountStatusHtml} </div>
        </div>


        <div class="detail-section">
            

            <div class="paid-amount">$${yourAmount.toFixed(2)}</div>
            
        </div>

        <button id="confirm-pay-btn">Confirm Pay</button>
        <button id="cancel-pay-btn" >Cancel</button>
        </div>
    `;


    let payerAmountStatus = bill.AmountStatus;

    

    // Set up the Confirm Pay button listener
    document.getElementById("confirm-pay-btn").addEventListener("click", () => {
        confirmPayment(bill, id);
    });

    document.getElementById("cancel-pay-btn").addEventListener("click", () => {
        window.location.href = "main_page.html";
    });


//     const container = document.getElementById("container-id");
// const newElement = document.createElement("div");
// newElement.textContent = "I'm new here";

// // Insert before the last child
// container.insertBefore(newElement, container.lastElementChild);



    if (payerAmountStatus[currentUser.data.Name][1]) {
        
        // document.getElementById("confirm-pay-btn").remove();
        document.getElementById("confirm-pay-btn").remove();
        const detailCard = document.getElementById("bill-detail-card");
        const wrapper = document.createElement('div');
        document.getElementById('cancel-pay-btn').innerHTML = "Return";
        if (bill.State == 'close') {
            wrapper.innerHTML = '<div class="detail-section paid-message">All members has paid</div>'
        } else {
            wrapper.innerHTML = '<div class="detail-section paid-message">You already paid</div>';
        }
        detailCard.insertBefore(wrapper.firstElementChild, detailCard.lastElementChild);
    }
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
async function addSingleBill(id, i, type) {
    const billRef = db.collection("Bills").doc(id);
    const billSnap = await billRef.get();
    const billMenu = document.getElementById(`${type}-scroll-menu`);
            

    

    if (billSnap.exists) { // if can found such snapshot
        const billData = billSnap.data();
        const billInitiater = billData.name;
        const billDescription = billData.description;
        const billDate = billData.date;
        const billCategory = billData.category;
        const billAmount = billData.AmountStatus[currentUser.data.Name][0];
        
        if (billData.State == "open") { // only do stuff when the bill is still open
            console.log("billSnap id: " + billRef.id);
            
            

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
                console.log("the id in addSingleBill is", id);
                payCurrentBill(billData, id);
            })

            const buttonWrapper = document.createElement("div");
            buttonWrapper.appendChild(button);
            document.getElementById(`bill-entry-${i}`).appendChild(buttonWrapper);
        } else {
            let closeHtml = `<div class="bill-entry close" id = "bill-entry-${i}">
                        <div class="bill-info">
                            <div class="bill-description bill-description-close">${billDescription}</div>
                            <div class="bill-meta">
                                <span class="bill-date">${billDate}</span>
                                <span class="bill-category bill-category-close">${billCategory}</span>
                                <span class = "bill-initializer">Created by: ${billInitiater}</span>
                            </div>
                        </div>
                        <div class="bill-amount">$${billAmount.toFixed(2)}</div>
            </div>`;
            billMenu.insertAdjacentHTML('beforeend', closeHtml);
            // add a button & call payCurrentBill

            const button = document.createElement("button");
            button.className = "btn-detail";
            button.innerText = "Details";
            

            button.addEventListener("click", ()=> {
                console.log("the id in addSingleBill is", id);
                payCurrentBill(billData, id);
            })

            const buttonWrapper = document.createElement("div");
            buttonWrapper.appendChild(button);
            document.getElementById(`bill-entry-${i}`).appendChild(buttonWrapper);
        }
    }
}





async function loadBills(billtype) {

    const userName = currentUser.data.Name;

    const userSnapshot = await db.collection("billsplitter_users").where("Name", "==", userName).get();
    const billsSnapshot = await userSnapshot.docs[0].ref.collection(billtype).get();


    const BillType = billtype.toLowerCase();

    const billMenu = document.getElementById(`${BillType}-scroll-menu`);
    
    if (!billsSnapshot.empty) {
        billMenu.innerHTML = "";
    }

    let i = 0;

    const docsArray = billsSnapshot.docs

    if (!billsSnapshot.empty) {


        for (let j = 0; j < docsArray.length; j++) {
            const curId = docsArray[j].data().billId;
            // fetch the actual bill from the universal "Bills" collection
            await addSingleBill(curId, i, BillType);
            i += 1;
            if (i % 5 == 0) { // only add first five
                break;
            }
        }


        async function loadBillChunk() {
            document.getElementById("more-bill-btn").remove();
                for (let j = i; j < docsArray.length; j++) { // load five more
                    const curId = docsArray[j].data().billId;

                    // fetch the actual bill from the universal "Bills" collection
                    await addSingleBill(curId, i, BillType);
                    i += 1;
                    if (i % 5 == 0) { // only add first five
                        break;
                    }
                }

                if (i < docsArray.length) { // if there are still more bills to load, add the button back
                    console.log("inside this block", i, docsArray.length);
                    let moreButton = `<div class="more-bill-section"><button id = "more-bill-btn">More</button></div>`;
                    billMenu.insertAdjacentHTML("beforeend", moreButton);
                    document.getElementById("more-bill-btn").addEventListener("click", loadBillChunk);

                } else { // no more bills to load
                    console.log("the value of i is: ", i);
                }
        }


        if (docsArray.length > i) { // if there are still more to load
            let moreButton = `<div class="more-bill-section"><button id = "more-bill-btn">More</button></div>`;
            billMenu.insertAdjacentHTML("beforeend", moreButton);
            document.getElementById("more-bill-btn").addEventListener("click", loadBillChunk);
        }
    }



}

document.addEventListener('DOMContentLoaded', function() {
    fetchUserName();
    animateChartSegments();
    loadBills("Bills");
    loadBills("Request");
});
