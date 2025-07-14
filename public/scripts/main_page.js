const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

const categoryCode = {
  Food: 0,
  Personal: 1,
  Entertainment: 2,
  Transportation: 3,
  Housing: 4,
  Supplies: 5,
  Miscellaneous: 6,
};

const currentUser = JSON.parse(localStorage.getItem("currentUser"));

const billsArr = [];
const requestArr = [];

async function fetchUserName() {
  if (currentUser) {
    // Display the user name from the stored data
    const userName = currentUser.data.Name;
    const userSnapshot = await db
      .collection("billsplitter_users")
      .where("Name", "==", userName)
      .get();
    if (userSnapshot.empty) {
      console.alert("cannot find such user in fetchUserName");
    }

    const userData = userSnapshot.docs[0].data();
    const userBalance = userData.Balance;
    const userOwedAmount = userData.Owed;
    const userOwnAmont = userData.Own;

    document.querySelector(".profile-name").innerText = `${userName}`;
    document.querySelector(".user-balance").innerHTML = `${userBalance}`;
    document.getElementById("owed-amt").innerHTML = `${userOwedAmount}`;
    document.getElementById("own-amt").innerHTML = `${userOwnAmont}`;
  } else {
    console.log("No user is currently logged in.");
    alert("Please log in first.");
    window.location.href = "index.html"; // Redirect to login page if no user is found
  }
}

function animateChartSegments() {
  const paths = document.querySelectorAll(".chart-container path");
  paths.forEach((path, index) => {
    setTimeout(() => {
      path.style.transition = "all 0.7s ease-out";
      path.style.transform = "scale(1.05)";

      setTimeout(() => {
        path.style.transform = "scale(1)";
      }, 300);
    }, index * 200);
  });
}

function showPaymentSuccess() {
  const successMessage =
    '<div class="detail-section success-message">Successfully paid!  Redirecting...</div>';
  document
    .getElementById("bill-detail-card")
    .insertAdjacentHTML("beforeend", successMessage);

  // remove the two buttons once payment succeed
  document.getElementById("confirm-pay-btn").remove();
  document.getElementById("cancel-pay-btn").remove();

  setTimeout(() => {
    window.location.href = "main_page.html";
  }, 2500);
}

function testPrint() {
  billsArr.forEach((billData, i) => {
    console.log(billData.AmountStatus);
    console.log(billData.id);
  });
}

async function getAllBills() {
  const userSnapshot = await db
    .collection("billsplitter_users")
    .where("Name", "==", currentUser.data.Name)
    .get();
  const billsSnapshot = await userSnapshot.docs[0].ref
    .collection("Bills")
    .get();

  const requestSnapshot = await userSnapshot.docs[0].ref
    .collection("Request")
    .get();

  const billsDocsArray = billsSnapshot.docs;
  const requestDocsArray = requestSnapshot.docs;

  if (!billsSnapshot.empty) {
    for (let j = 0; j < billsDocsArray.length; j++) {
      const curId = billsDocsArray[j].data().billId;

      const billRef = db.collection("Bills").doc(curId);
      const billSnap = await billRef.get();

      if (billSnap.exists) {
        const billData = billSnap.data();
        billData.id = curId;
        billsArr.push(billData);
      }
    }
  }

  if (!requestSnapshot.empty) {
    for (let j = 0; j < requestDocsArray.length; j++) {
      const curId = requestDocsArray[j].data().billId;

      const billRef = db.collection("Bills").doc(curId);
      const billSnap = await billRef.get();

      if (billSnap.exists) {
        const billData = billSnap.data();
        billData.id = curId;
        requestArr.push(billData);
      }
    }
  }

  billsArr.sort((a, b) => {
    if (a.State === "open" && b.State !== "open") return -1; // a comes before b
    if (a.State !== "open" && b.State === "open") return 1; // b comes before a
    return 0; // no change in order
  });

  requestArr.sort((a, b) => {
    if (a.State === "open" && b.State !== "open") return -1;
    if (a.State !== "open" && b.State === "open") return 1;
    return 0;
  });

  testPrint();
}

async function confirmPayment(bill) {
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

  const id = bill.id;
  const payerName = currentUser.data.Name;
  const initiaterName = bill.name;

  const payerSnapshot = await db
    .collection("billsplitter_users")
    .where("Name", "==", payerName)
    .get();
  const payerAmount = bill.AmountStatus[payerName][0];

  let payerAmountStatus = bill.AmountStatus;

  payerAmountStatus[payerName][1] = true;

  // updateBill
  let updateBillAmount = bill.amount - payerAmount;
  const updateBillState = updateBillAmount == 0 ? "close" : "open";

  await db.collection("Bills").doc(id).update({
    State: updateBillState,
    amount: updateBillAmount,
    AmountStatus: payerAmountStatus,
  });

  if (!payerSnapshot.empty) {
    const payerData = payerSnapshot.docs[0].data();

    let payerBalance = payerData.Balance;
    let payerSpendings = payerData.Spendings;

    if (payerSpendings == undefined) {
      payerSpendings = new Array(7).fill(0);
      // ["Food": 0, "Personal": 1,"Entertainment": 2,"Transportation": 3,"Housing": 4, "Supplies": 5,"Miscellaneous": 6]
    }

    payerSpendings[categoryCode[bill.category]] += payerAmount;

    payerBalance -= payerAmount;

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

  const initiaterSnapshot = await db
    .collection("billsplitter_users")
    .where("Name", "==", initiaterName)
    .get();
  if (!initiaterSnapshot.empty) {
    // add amount to bill owner's balance
    const initiaterData = initiaterSnapshot.docs[0].data();

    let initiaterBalance = initiaterData.Balance;

    const initiaterDoc = initiaterSnapshot.docs[0];
    const initiaterRef = initiaterDoc.ref;

    await initiaterRef.update({
      Balance: initiaterBalance,
    });
  }

  showPaymentSuccess();
}

function paymentDetailPage(bill) {
  const container = document.getElementById("dashboard-container");

  // Generate dynamic content for amount status
  const yourAmount = bill.AmountStatus[currentUser.data.Name][0];

  const amountStatusHtml = Object.entries(bill.AmountStatus || {})
    .map(([name, [amount, paid]]) => {
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
    `;
    })
    .join("");

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
    confirmPayment(bill);
  });

  document.getElementById("cancel-pay-btn").addEventListener("click", () => {
    window.location.href = "main_page.html";
  });

  if (payerAmountStatus[currentUser.data.Name][1]) {
    document.getElementById("confirm-pay-btn").remove();
    const detailCard = document.getElementById("bill-detail-card");
    const wrapper = document.createElement("div");
    document.getElementById("cancel-pay-btn").innerHTML = "Return";
    if (bill.State == "close") {
      wrapper.innerHTML =
        '<div class="detail-section paid-message">All members has paid</div>';
    } else {
      wrapper.innerHTML =
        '<div class="detail-section paid-message">You already paid</div>';
    }
    detailCard.insertBefore(
      wrapper.firstElementChild,
      detailCard.lastElementChild
    );
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
async function addSingleBill(billData, i, type) {
  const billMenu = document.getElementById(`${type}-scroll-menu`);

  if (billData) {
    // if can found such snapshot
    // const billData = billSnap.data();
    const billInitiater = billData.name;
    const billDescription = billData.description;
    const billDate = billData.date;
    const billCategory = billData.category;
    const billAmount = billData.AmountStatus[currentUser.data.Name][0];

    if (billData.State == "open") {
      // only do stuff when the bill is still open

      let curEntryHtml = `<div class="bill-entry" id = "bill-entry-${i}">
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

      billMenu.insertAdjacentHTML("beforeend", curEntryHtml);

      const button = document.createElement("button");
      button.className = "btn";
      button.innerText = "Pay";

      button.addEventListener("click", () => {
        paymentDetailPage(billData);
      });

      const buttonWrapper = document.createElement("div");
      buttonWrapper.appendChild(button);

      billMenu.querySelector(`#bill-entry-${i}`).appendChild(buttonWrapper);
    } else {
      // if the currentBill is closed -> paid full
      let closeHtml = `<div class="bill-entry close" id = "bill-entry-${i}">
                        <div class="bill-info">
                            <div class="bill-description bill-description-close">${billDescription}</div>
                            <div class="bill-meta">
                                <span class="bill-date">${billDate}</span>
                                <span class="bill-category bill-category-close">${billCategory}</span>
                                <span class = "bill-initializer">Created by: ${billInitiater}</span>
                            </div>
                        </div>
                        <div class="bill-amount bill-amount-close">$${billAmount.toFixed(
                          2
                        )}</div>
            </div>`;
      billMenu.insertAdjacentHTML("beforeend", closeHtml);

      const button = document.createElement("button");
      button.className = "btn-detail";
      button.innerText = "Details";

      button.addEventListener("click", () => {
        paymentDetailPage(billData);
      });

      const buttonWrapper = document.createElement("div");
      buttonWrapper.appendChild(button);
      billMenu.querySelector(`#bill-entry-${i}`).appendChild(buttonWrapper);
    }
  }
}

async function loadBills(billtype) {
  const billMenu = document.getElementById(
    `${billtype.toLowerCase()}-scroll-menu`
  );

  let i = 0;

  let docsArray = [];

  if (billtype == "Bills") {
    docsArray = billsArr;
  } else {
    docsArray = requestArr;
  }

  if (!docsArray.empty) {
    // only load the first five bills
    billMenu.innerHTML = ""; // clear out the No Record part
    for (let j = 0; j < docsArray.length; j++) {
      const billData = docsArray[j];

      // fetch the actual bill from the universal "Bills" collection
      await addSingleBill(billData, i, billtype.toLowerCase());
      console.log("after");
      i += 1;
      if (i % 5 == 0) {
        // only add first five
        break;
      }
    }

    async function loadBillChunk() {
      document.getElementById("more-bill-btn").remove();
      for (let j = i; j < docsArray.length; j++) {
        // load five more
        const billData = docsArray[j];

        // fetch the actual bill from the universal "Bills" collection
        await addSingleBill(billData, i, billtype.toLowerCase());
        i += 1;
        if (i % 5 == 0) {
          break;
        }
      }

      if (i < docsArray.length) {
        // if there are still more bills to load, add the button back
        let moreButton = `<div class="more-bill-section"><button id = "more-bill-btn">More</button></div>`;
        billMenu.insertAdjacentHTML("beforeend", moreButton);
        document
          .getElementById("more-bill-btn")
          .addEventListener("click", loadBillChunk);
      } else {
        // no more bills to load
        console.log("No more bills to load");
      }
    }

    if (docsArray.length > i + 1) {
      // if there are still more to load
      let moreButton = `<div class="more-bill-section"><button id = "more-bill-btn">More</button></div>`;
      billMenu.insertAdjacentHTML("beforeend", moreButton);
      document
        .getElementById("more-bill-btn")
        .addEventListener("click", loadBillChunk);
    }
  }
}

async function initChartRendering() {
  await renderSpendingsChart(); // wait for donut chart rendering to finish
  animateChartSegments(); // then run this
}

async function loadAndSetAllBillSnap() {
  await getAllBills();
  await loadBills("Bills");
  await loadBills("Request");
}

document.addEventListener("DOMContentLoaded", () => {
  fetchUserName();
  initChartRendering();
  loadAndSetAllBillSnap();
});

const serviceHTML = `<main class="container">
    <h1>Our Services</h1>
    <div class="services-grid">
      <div class="service-card">
        <div class="service-title">Bill Splitting</div>
        <div class="service-description">
          Easily split expenses among friends, roommates, or coworkers with transparent tracking.
        </div>
      </div>
      <div class="service-card">
        <div class="service-title">Request Management</div>
        <div class="service-description">
          Send or receive payment requests and track who still owes you — all in one place.
        </div>
      </div>
      <div class="service-card">
        <div class="service-title">Balance Overview</div>
        <div class="service-description">
          See how much you owe and how much is owed to you with clean, real-time summaries.
        </div>
      </div>
      <div class="service-card">
        <div class="service-title">Expense Categories</div>
        <div class="service-description">
          Organize your bills into categories like grocery, personal, or gas for better insights.
        </div>
      </div>
      <div class="service-card">
        <div class="service-title">Activity History</div>
        <div class="service-description">
          Access your full history of payments and bill creation to stay on top of your finances.
        </div>
      </div>
    </div>
  </main>

  <footer>
    <p>&copy; 2025 ADJC. All rights reserved.</p>
  </footer>`;

document.getElementById("services-header").addEventListener("click", () => {
  document.getElementById("dashboard-container").innerHTML = serviceHTML;
});

const contactHTML = `<div class="page-title">
      <h1 id="contact-h1">Contact Us</h1>
      <p>Get in touch with our team for questions, feedback, or to learn more about our bill-splitting solution.</p>
    </div>
    
    <div class="contact-container">
      <div class="contact-info">
        <div>
          <div class="contact-item">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30579b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              Email
            </h3>
            <p><a href="mailto:caiyl0529@gmail.com">caiyl0529@gmail.com</a></p>
          </div>
          
          <div class="contact-item">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30579b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Phone
            </h3>
            <p><a href="tel:+1 2244214083">+ 1 224 421 4083</a></p>
          </div>
          
          <div class="contact-item">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30579b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Address
            </h3>
            <p>University of Illinois Urbana-Champaign<br>
            1401 W Green St<br>
            Urbana, IL 61801<br>
            United States</p>
          </div>
        </div>
      </div>
      
      <div class="map-container">
        <iframe class="map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3064.247793957372!2d-88.22731442357693!3d40.10233617149783!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x880cd7387d688f61%3A0x21a666f0559593a5!2sUniversity%20of%20Illinois%20Urbana-Champaign!5e0!3m2!1sen!2sus!4v1710688241567!5m2!1sen!2sus" allowfullscreen="" loading="lazy"></iframe>
      </div>
    </div>
    
    <div class="email-signup">
      <h2>Join Our Email List</h2>
      <p>We are a student group that's working on helping people split their bills more efficiently and conveniently. If you are interested in our project, you can add yourself to our email list to receive updates, early access, and more information.</p>
      <div class="email-form">
        <input type="email" placeholder="Enter your email address">
        <button type="button">Subscribe</button>
      </div>
    </div>
    
    <footer>
      <p>&copy; 2025 ADJC. All rights reserved.</p>
    </footer>`;

document.getElementById("contact-header").addEventListener("click", () => {
  document.getElementById("dashboard-container").innerHTML = contactHTML;
});

//////////////////////////////////////
/////////////SVG Rendering///////////
////////////////////////////////////

function insertTableRow(category, color, amount, percentage) {
  const tableBody = document.getElementById("spending-table-body");
  const temp = document.createElement("tbody");
  temp.innerHTML = `
    <tr id="${category}-row" class="category-rows">
      <td><span id="${category}-color-rec" class="spending-table-color-rec"></span> ${category}</td>
      <td>${percentage.toFixed(1)}%</td>
      <td>$${amount.toFixed(2)}</td>
    </tr>
  `;
  const row = temp.firstElementChild;
  tableBody.appendChild(row);
  document.getElementById(`${category}-color-rec`).style.backgroundColor =
    color;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  const x_coord = cx + r * Math.cos(angleRad);
  const y_coord = cy + r * Math.sin(angleRad);
  return { x: x_coord, y: y_coord };
}

function describeArcPath(x, y, radius, startAngle, endAngle) {
  const startPoint = polarToCartesian(x, y, radius, startAngle);
  const endPoint = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? "1" : "0";

  const pathAttributes = [
    "M",
    startPoint.x.toFixed(2),
    startPoint.y.toFixed(2),
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    1,
    endPoint.x.toFixed(2),
    endPoint.y.toFixed(2),
    "L",
    x,
    y,
    "Z",
  ];
  return pathAttributes.join(" ");
}

function setTipListener(element, tip, data) {
  element.addEventListener("mouseover", () => {
    element.setAttribute("transform", "scale(1.1)");

    const bbox = element.getBoundingClientRect(); // bounding box of the path
    const containerBox = document
      .querySelector(".chart-container")
      .getBoundingClientRect();
    // Calculate position relative to the chart container
    // const offsetX = bbox.left - containerBox.left - 80; // // if want to place on the right
    const offsetX = bbox.right - containerBox.left - 10; // // if want to place on the left side
    const offsetY = bbox.top - containerBox.top + bbox.height / 2 - 10;
    tip.style.left = `${offsetX}px`;
    tip.style.top = `${offsetY}px`;

    // sets up the tooltip's data
    tip.innerHTML = `
        <strong>${data.curCategory}</strong><br>
        $${data.amt} (${((data.amt / data.sum) * 100).toFixed(2)}%)`;
    document.getElementById(`${data.curCategory}-row`).style.backgroundColor =
      data.curColor;

    tip.style.backgroundColor = data.curColor;
    tip.style.display = "block";
  });

  element.addEventListener("mouseleave", () => {
    element.setAttribute("transform", "scale(1)");
    tip.style.display = "none";
    document.getElementById(`${data.curCategory}-row`).style.backgroundColor =
      "white";
  });
}

async function renderSpendingsChart() {
  const userSnapshot = await db
    .collection("billsplitter_users")
    .where("Name", "==", currentUser.data.Name)
    .get();
  const userData = userSnapshot.docs[0].data();
  const spendings = userData.Spendings;

  const colors = [
    "#a0b4db",
    "#4b6cb7",
    "#6e9de8",
    "#e5eeff",
    "#ffb347",
    "#87d68d",
    "#ff8da1",
  ];
  const categories = [
    "Food",
    "Personal",
    "Entertainment",
    "Transportation",
    "Housing",
    "Supplies",
    "Miscellaneous",
  ];

  let sum = spendings.reduce((a, b) => a + b, 0); // total of all spendings
  const segmentGroup = document.getElementById("donut-segments");
  segmentGroup.innerHTML = '<circle cx="0" cy="0" r="60" fill="white"/>'; // put the center white circle in
  const categorytip = document.getElementById("tooltip");

  let startAngle = 0;

  let defaultSpendings = false;
  if (sum == 0) {
    // Spendings is empty array
    sum = 7;
    defaultSpendings = true;
  }

  spendings.forEach((amt, index) => {
    let curAmt = amt;

    if (defaultSpendings) {
      curAmt = 1;
    }
    const curCategory = categories[index];
    const curColor = colors[index];

    insertTableRow(curCategory, curColor, amt, (amt / sum) * 100);

    const sliceInDegree = (curAmt / sum) * 360; // percentage * 360
    const endAngle = startAngle + sliceInDegree;

    let element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    if (sliceInDegree >= 359.99) {
      // if the slice is a full circle
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", "0");
      circle.setAttribute("cy", "0");
      circle.setAttribute("r", "150");
      circle.setAttribute("fill", curColor);
      element = circle;
    } else {
      // if there is more than two category with a non-zero value
      const arcAttributes = describeArcPath(0, 0, 150, startAngle, endAngle);
      element.setAttribute("d", arcAttributes);
      element.setAttribute("fill", curColor);
    }

    const data = {
      curCategory: curCategory,
      curColor: curColor,
      amt: amt,
      sum: sum,
    };

    setTipListener(element, categorytip, data);

    segmentGroup.insertBefore(element, segmentGroup.firstChild);
    startAngle = endAngle;
  });
}

const test = () => {
  window.location.href = "billdetail.html";
};
