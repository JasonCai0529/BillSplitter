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
// const billAdded = localStorage.getItem("billAdded") === "true";

const billsArr = [];
const requestArr = [];

let billAdded = true;

async function loadHTML(filepath, container = "dashboard-container") {
  const res = await fetch(filepath);
  const html = await res.text();
  document.getElementById(container).innerHTML = html;
}

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

async function getAllBills() {
  // console.log("billADDEd", billAdded);
  if (!billAdded) {
    console.log("no need to add more");
    return;
  }
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
      if (billsArr.length == billsDocsArray.length) {
        break;
      }
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
      if (requestArr.length == requestDocsArray.length) {
        break;
      }
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

  let sortState = (a, b) => {
    if (a.State === "open" && b.State !== "open") return -1; // a comes before b
    if (a.State !== "open" && b.State === "open") return 1; // b comes before a
    return 0; // no change in order
  };

  billsArr.sort(sortState);
  requestArr.sort(sortState);

  billAdded = false;

  // localStorage.setItem("billAdded", "false");
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

  let unpaidAmt = bill.unpaidAmount;
  if (unpaidAmt == undefined) {
    unpaidAmt = bill.amount;
  }
  let updateBillAmount = unpaidAmt - payerAmount;
  const updateBillState = updateBillAmount == 0 ? "close" : "open";

  await db
    .collection("Bills")
    .doc(id)
    .update({
      State: updateBillState,
      unpaidAmount: updateBillAmount.toFixed(2),
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
        <p><strong>Unpaid Amount:</strong> $${bill.unpaidAmount}</p>

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

document.getElementById("services-header").addEventListener("click", () => {
  loadHTML("partials/service.html");
});

document.getElementById("contact-header").addEventListener("click", () => {
  loadHTML("partials/contact.html");
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

async function loadHTMLPartialsSyncWrapper(
  filepath,
  container = "dashboard-container"
) {
  await loadHTML(filepath, container);
}

const billDetailPageHTML = `<div class="bill-detail-dashboard-grid">
  <div class="bill-detail-section-card section-card">
    <div class="section-header">
      <h3>Bills</h3>
    </div>

    <div class="detail-card-container" id="bills-detail-scroll-menu">
      <!-- No record yet -->
      <!-- small bill data -->
    </div>
  </div>

  <div class="bill-detail-section-card section-card">
    <div class="section-header">
      <h3>Request</h3>
    </div>
    <div class="detail-card-container" id="request-scroll-menu"></div>
  </div>
</div>`;

const viewmoreBtns = document.querySelectorAll(".viewmore-btn");

viewmoreBtns.forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("dashboard-container").innerHTML =
      billDetailPageHTML;

    let i = 0;
    billsArr.forEach((billData) => {
      const curBillBox = `<div class="bill-detail-box">
            <div class="bill-header">
              <span class="bill-title">${billData.description}</span>
              <span class="bill-detail-amount">$${billData.amount}</span>
            </div>
            <div class="bill-info">
              <span>${billData.category}</span>
              <span> ${billData.name}</span>
              <span>${billData.date}</span>
              <span>Unpaid: $${billData.unpaidAmount}<span>
            </div>
            
            <div class="payer-section" id="bill-detail-payer-section-${i}">
              
            </div>
           
          </div>`;

      document
        .getElementById("bills-detail-scroll-menu")
        .insertAdjacentHTML("beforeend", curBillBox);

      const payerSection = document.getElementById(
        `bill-detail-payer-section-${i}`
      );
      Object.entries(billData.AmountStatus || {}).map(
        ([name, [amount, paid]]) => {
          if (name == currentUser.data.Name) name = "You";
          const paidSPAN = paid
            ? `<span class="paid paid">✓</span>`
            : `<span class="paid unpaid">x</span>`;

          const singlePayerDiv = `<div class="payer payer-paid-${paid}">
                      <span>${name}:</span><span>&nbsp;$${amount}</span
                      >${paidSPAN}
                    </div>`;

          payerSection.insertAdjacentHTML("beforeend", singlePayerDiv);
        }
      );

      i += 1;
    });

    let j = 0;
    requestArr.forEach((billData) => {
      const curBillBox = `<div class="bill-detail-box">
            <div class="bill-header">
              <span class="bill-title">${billData.description}</span>
              <span class="bill-detail-amount">$${billData.amount}</span>
            </div>
            <div class="bill-info">
              <span>${billData.category}</span>
              <span> ${billData.name}</span>
              <span>${billData.date}</span>
              <span>Unpaid: $${billData.unpaidAmount}<span>
            </div>
            
            <div class="payer-section" id="bill-detail-payer-section-request-${j}">
              
            </div>
           
          </div>`;

      document
        .getElementById("request-scroll-menu")
        .insertAdjacentHTML("beforeend", curBillBox);

      const payerSection = document.getElementById(
        `bill-detail-payer-section-request-${j}`
      );
      Object.entries(billData.AmountStatus || {}).map(
        ([name, [amount, paid]]) => {
          if (name == currentUser.data.Name) name = "You";
          const paidSPAN = paid
            ? `<span class="paid paid">✓</span>`
            : `<span class="paid unpaid">x</span>`;

          const singlePayerDiv = `<div class="payer payer-paid-${paid}">
                      <span>${name}:</span><span>&nbsp;$${amount}</span
                      >${paidSPAN}
                    </div>`;

          payerSection.insertAdjacentHTML("beforeend", singlePayerDiv);
        }
      );

      j += 1;
    });
  });
});

////////////////
// Create HTML
// script.js
////////////////

let selectedParticipants = [];
const createBillHTML = `<div class="bill-form">
          <h2>Create New Bill</h2>

          <div class="form-grid">
            <div>
              <div class="form-section">
                <h3>Bill Details</h3>

                <div class="form-group">
                  <label class="form-label">Bill Description</label>
                  <input
                    type="text"
                    class="form-control"
                    id="bill-description"
                    placeholder="e.g. Dinner at Italian Restaurant"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Your Amount</label>
                  <input
                    type="number"
                    class="form-control"
                    id="your-amount"
                    placeholder="0.00"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Date</label>
                  <input type="date" id="date" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">Category</label>
                  <select class="form-control">
                    <option value="" selected disabled>
                      Select a category
                    </option>
                    <option value="Food">Food</option>
                    <option value="Personal">Personal</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Housing">Housing</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div
                  class="create-bill- alert hidden"
                  id="more-detail-create-bill-"
                ></div>
              </div>
            </div>

            <div>
              <div class="form-section">
                <h3>Bill Participants</h3>
                <p style="margin-bottom: 15px; color: var(--dark-gray)">
                  Start with your amount, then add others who will contribute to
                  this bill.
                </p>

                <div class="participant-list">
                  <div class="participant">
                    <div class="participant-name">You</div>
                    <button class="remove-create-bill-btn" disabled></button>
                    <span class="participant-check">✓</span>
                  </div>
                  <div
                    class="create-bill- alert hidden"
                    id="addParticipant-create-bill-"
                  ></div>
                  <div class="add-participant">
                    <!-- <input type="text" id="participant-input" class="form-control" placeholder="Add participant by username"> -->

                    <div class="autocomplete-wrapper">
                      <input
                        type="text"
                        id="participant-input"
                        class="form-control"
                        placeholder="Add participant by username"
                      />
                      <div
                        id="autocomplete-list"
                        class="autocomplete-items"
                      ></div>
                    </div>

                    <button class="create-bill-btn" onclick="addParticipant()">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="button-group">
            <a
              href="main_page.html"
              class="create-bill-btn create-bill-btn-secondary"
              >Cancel</a
            >
            <button class="create-bill-btn" onclick="addBill()">
              Create Bill
            </button>
          </div>
        </div>`;

document.getElementById("create-a-bill-btn").addEventListener("click", () => {
  document.getElementById("dashboard-container").innerHTML = createBillHTML;
  selectedParticipants = []; // empty out the previous array

  setMaxDate();
  autoCompleteParticipant();
});

function setMaxDate() {
  const today = new Date().toISOString().split("T")[0];
  console.log(today + " " + new Date().toISOString());
  if (document.getElementById("date")) {
    document.getElementById("date").setAttribute("max", today);
  }
}

function autoCompleteParticipant() {
  document
    .getElementById("participant-input")
    .addEventListener("input", async function () {
      // auto complete list of Participants
      const input = this.value.trim().toLowerCase();
      const list = document.getElementById("autocomplete-list");
      list.innerHTML = ""; // clear previous suggestions

      if (!input) return;

      try {
        const snapshot = await db.collection("billsplitter_users").get();
        const matches = [];

        snapshot.forEach((doc) => {
          const userData = doc.data();
          const userName = userData.Name?.toLowerCase();
          if (userName && userName.includes(input)) {
            matches.push(userData.Name);
          }
        });

        matches.forEach((name) => {
          const item = document.createElement("div");
          item.textContent = name;
          item.onclick = function () {
            document.getElementById("participant-input").value = name;
            list.innerHTML = "";
          };
          list.appendChild(item);
        });
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    });
}

function showToast(message, toastT) {
  const toast = document.getElementById(toastT);
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  // Hide it after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
  }, 2500);
}

// Add participant function

async function addParticipant() {
  const input = document.getElementById("participant-input");
  const name = input.value.trim();

  const userInfo = JSON.parse(localStorage.getItem("currentUser"));
  const username = userInfo?.data?.Name || "Unknown";
  if (name === username) {
    alert("This participant is already added.");
    input.value = "";
    return;
  }

  if (!name) return;

  // Check for duplicates
  if (selectedParticipants.includes(name)) {
    alert("This participant is already added.");
    input.value = "";
    return;
  }

  try {
    const snapshot = await db
      .collection("billsplitter_users")
      .where("Name", "==", name)
      .get();

    if (snapshot.empty) {
      alert("User not found. Please enter a valid username.");
      return;
    }

    selectedParticipants.push(name);

    const participantList = document.querySelector(".participant-list");
    const participant = document.createElement("div");
    participant.className = "participant";
    participant.innerHTML = `
            <div class="participant-name">${name}</div>
            <button class="remove-create-bill-btn" onclick="removeParticipant('${name}', this)">✕</button>
        `;

    const addParticipantDiv = document.querySelector(".add-participant");
    participantList.insertBefore(participant, addParticipantDiv);

    input.value = "";
    console.log(
      "selectedParticipants array has been updated" + selectedParticipants
    );
  } catch (error) {
    console.error("Error checking user:", error);
    alert("Something went wrong when searching for the user.");
  }
}

function removeParticipant(name, button) {
  const index = selectedParticipants.indexOf(name);
  if (index > -1) {
    selectedParticipants.splice(index, 1);
  }
  button.parentElement.remove();
}

// bill = "name, description, category, time, amount, participants"
async function addBill() {
  const description = document
    .querySelector('input[placeholder="e.g. Dinner at Italian Restaurant"]')
    .value.trim();
  const amount = parseFloat(document.getElementById("your-amount").value);
  const category = document.querySelector("select").value;
  const date = document.querySelector('input[type="date"]').value;

  // get the current user's info
  const userInfo = JSON.parse(localStorage.getItem("currentUser"));
  const name = userInfo?.data?.Name || "Unknown";
  if (!description || !amount || !category || !date) {
    showToast("Please fill out all bill details", "more-detail-toast");
    return;
  }

  if (selectedParticipants.length === 0) {
    showToast(
      "Add at least one participant besides yourself",
      "addParticipant-toast"
    );
    return;
  }

  // add bill initiater to the list
  selectedParticipants.push(name);

  let status = {};

  const splitAmount = parseFloat(
    (amount / selectedParticipants.length).toFixed(2)
  );

  selectedParticipants.forEach((name) => {
    status[name] = [splitAmount, false];
  });

  const billData = {
    name: name,
    description: description,
    category: category,
    date: date,
    amount: amount.toFixed(2),
    unpaidAmount: amount.toFixed(2),
    Participants: selectedParticipants,
    AmountStatus: status,
    State: "open",
  };

  console.log("thie bill is :", billData);

  let billId = "";
  try {
    // 1. Add the bill to "Bills" collection and get its ID
    const billRef = await db.collection("Bills").add(billData);
    billId = billRef.id;

    console.log("Bill added:", billData);

    // 2. Send a request to each participant
    for (const participantName of selectedParticipants) {
      if (participantName === name) continue;

      const userSnapshot = await db
        .collection("billsplitter_users")
        .where("Name", "==", participantName)
        .get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userRef = userDoc.ref;

        const updatedOwedAmount =
          userDoc.data().Owed + status[participantName][0];
        // add the bill id to the users bills
        userRef.collection("Bills").add({ billId }); // create new doc
        console.log("updating " + participantName + "'s Owed amount");
        await userRef.update({
          // update "Owed field for each participant in the bill"
          Owed: updatedOwedAmount,
        });
        console.log(`Request sent to ${participantName}`);
      } else {
        console.warn(`User ${participantName} not found.`);
      }
    }

    // Add full amount to bill owner's "Own" or "Owd you" field immediately
    const ownerSnapshot = await db
      .collection("billsplitter_users")
      .where("Name", "==", name)
      .get();

    if (!ownerSnapshot.empty) {
      const ownerDoc = ownerSnapshot.docs[0];
      const ownerRef = ownerDoc.ref;

      if (billId) {
        ownerRef.collection("Request").add({ billId });
      }

      const ownAmount = ownerDoc.data().Own;
      await ownerRef.update({
        Owed: ownerDoc.data().Owed + status[name][0],
        Own: ownAmount + amount,
      });
    }

    // localStorage.setItem("billAdded", "true");
    billAdded = true;
    window.location.href = "main_page.html";
  } catch (error) {
    console.error("Error adding bill and sending requests:", error);
  }
}
