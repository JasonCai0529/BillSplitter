// import firebase from "firebase/compat/app";

// import { getDataConnect } from "firebase/data-connect";


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser;
// add a single user with ({"Balance": 1, "Name": "Jason", Password: "2006", Spendings: [1, 2, 3, 4]});




// dropdown list of avaliable users to choose





async function getAllUsers() {
    console.log("Inside");
    try {
        const usersRef = db.collection("billsplitter_users"); // Reference the "users" collection
        const snapshot = await usersRef.get();  // Fetch all documents

        snapshot.forEach((doc) => {
            console.log("User ID:", doc.id, "Data:", doc.data());
        });

    } catch (error) {
        console.error("Error retrieving users:", error);
    }
}









document.getElementById("participant-input").addEventListener('input', async function () {
    const input = this.value.trim().toLowerCase();
    const list = document.getElementById('autocomplete-list');
    list.innerHTML = ''; // clear previous suggestions

    if (!input) return;

    try {
        const snapshot = await db.collection("billsplitter_users").get();
        const matches = [];

        snapshot.forEach(doc => {
            const userData = doc.data();
            const userName = userData.Name?.toLowerCase();
            if (userName && userName.includes(input)) {
                matches.push(userData.Name);
            }
        });

        matches.forEach(name => {
            const item = document.createElement('div');
            item.textContent = name;
            item.onclick = function () {
                document.getElementById('participant-input').value = name;
                list.innerHTML = '';
            };
            list.appendChild(item);
        });

    } catch (err) {
        console.error("Error fetching users:", err);
    }
});



// Login function



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

async function login(event) {
    event.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    try {
        const querySnapshot = await db.collection("billsplitter_users").where("Name", "==", username).get();

        if (querySnapshot.empty) {
            showToast(`Cannot find your Username : ${username}, please Sign-up first! Redirecting... `, "alert-toast");
            

            setTimeout(() => {
                window.location.href = "signup.html";
            }, 2500);
            return;
        }

        let userData;
        querySnapshot.forEach((doc) => {
            userData = doc.data();
            localStorage.setItem("currentUser", JSON.stringify({ id: doc.id, data: userData }));
        });

        // validate user with their password
        if (userData.Password == password) {
            showToast("Log in successful! Welcome back!", "top-toast");
            setTimeout(() => {
                window.location.href = "main_page.html";
            }, 2500);
        } else {
            showToast(`Password is incorrect. Please try again! `, "alert-toast");

        }

    } catch(error) {
        console.log("Error signing up");
    }
}

// Add participant function 
const selectedParticipants = [];

async function addParticipant() {
    const input = document.getElementById('participant-input');
    const name = input.value.trim();

    if (!name) return;

    // Check for duplicates
    if (selectedParticipants.includes(name)) {
        alert("This participant is already added.");
        input.value = '';
        return;
    }

    try {
        const snapshot = await db.collection("billsplitter_users").where("Name", "==", name).get();

        if (snapshot.empty) {
            alert("User not found. Please enter a valid username.");
            return;
        }

        selectedParticipants.push(name);

        const participantList = document.querySelector('.participant-list');
        const participant = document.createElement('div');
        participant.className = 'participant';
        participant.innerHTML = `
            <div class="participant-name">${name}</div>
            <button class="remove-btn" onclick="removeParticipant('${name}', this)">✕</button>
        `;

        const addParticipantDiv = document.querySelector('.add-participant');
        participantList.insertBefore(participant, addParticipantDiv);

        input.value = '';
        console.log("Selected participants:", selectedParticipants);

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
    console.log("Selected participants:", selectedParticipants);
}




// bill = "name, description, category, time, amount, participants"
async function addBill() {
    const userInfo = JSON.parse(localStorage.getItem("currentUser"));
    const name = userInfo?.data?.Name || "Unknown"; 
    const description = document.querySelector('input[placeholder="e.g. Dinner at Italian Restaurant"]').value.trim();
    const amount = parseFloat(document.getElementById("your-amount").value);
    const category = document.querySelector('select').value;
    const date = document.querySelector('input[type="date"]').value;    
    console.log("name: ",name, " description: ", description, " amount: ",amount," category: ", category, " date: ", date," selectedParticipants: ", selectedParticipants);
    if (!description || !amount || !category || !date) {
        alert("Please fill out all bill details.");
        return;
    }

    if (selectedParticipants.length === 0) {
        alert("Please add at least one participant.");
        return;
    }
      
    const billData = {
        "name":name,
        "description":description,
        "category":category,
        "date":date,
        "amount":amount.toFixed(2),
        "Participants":selectedParticipants.join(",")
    };

    console.log("thie bill is :", billData); 
    try {
        // 1. Add the bill to "Bills" collection and get its ID
        const billRef = await db.collection("Bills").add(billData);
        const billId = billRef.id;

        console.log("Bill added:", billData);

        const splitAmount = parseFloat((amount / selectedParticipants.length).toFixed(2));

        // 2. Send a request to each participant
        for (const participantName of selectedParticipants) {
            if (participantName === name) continue;

            const userSnapshot = await db.collection("billsplitter_users")
                .where("Name", "==", participantName).get();

            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const userRef = userDoc.ref;

                const pendingRef = userRef.collection("PendingRequests").doc(); // create new doc

                const requestData = {
                    billId,
                    from: name,
                    description,
                    amount: splitAmount,
                    date,
                    category,
                    status: "pending"
                };

                await pendingRef.set(requestData);
                console.log(`Request sent to ${participantName}`);
            } else {
                console.warn(`User ${participantName} not found.`);
            }
        }

        // 3. Add full amount to bill owner's balance immediately
        const ownerSnapshot = await db.collection("billsplitter_users")
            .where("Name", "==", name).get();

        if (!ownerSnapshot.empty) {
            const ownerDoc = ownerSnapshot.docs[0];
            const ownerRef = ownerDoc.ref;
            const ownerData = ownerDoc.data();
            const currentBalance = parseFloat(ownerData.Balance || "0");

            await ownerRef.update({
                Balance: (currentBalance + amount).toFixed(2).toString()
            });
        }

        window.location.href = "main_page.html";

    } catch (error) {
        console.error("Error adding bill and sending requests:", error);
    }
}