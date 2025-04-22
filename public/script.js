// import firebase from "firebase/compat/app";

// import { getDataConnect } from "firebase/data-connect";


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser;
// add a single user with ({"Balance": 1, "Name": "Jason", Password: "2006", Spendings: [1, 2, 3, 4]});
async function addUser(userData) {
    console.log("in addUser");
    try {
        await db.collection("billsplitter_users").add(userData);
        console.log("User with userData added successfully!", userData);
    } catch (error) {
        console.error("Error deleting user:", error);
    }
    
}

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


document.addEventListener("DOMContentLoaded", ()=> {

    // getAllUsers();


    
    // addUser({"Balance": 1, "Name": "Jason", Password: "2006", Spendings: [1, 2, 3, 4]})
    // console.log(users);
    // console.log(db.collection("billsplitter_users"));
})

// Signup function
async function signup(event) {
    event.preventDefault(); 

    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const balance = document.getElementById("newBalance").value;

    // console.log("Signing up with:", username, password);

    try {
        // Check if user already exist

        const usersRef = db.collection("billsplitter_users"); // Reference the "users" collection

        const snapshot = await usersRef.where("Name", "==", username).get()


        if (!snapshot.empty) {
            alert("User already exists");
            window.location.href = "login.html";
            return;
        }


        // Retrieve user details from Firestore
        await addUser({"Balance": balance, "Name": username, "Password": password, "Owed" : 0, "Owed you":0})
        alert("Sign-up Successful! You can login now");
        window.location.href = "login.html";
      } catch (error) {
        console.error("Sign up Failed:", error.message);
      }
}

// Login function
async function login(event) {
    event.preventDefault();

    

    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    try {
        const querySnapshot = await db.collection("billsplitter_users").where("Name", "==", username).get();

        if (querySnapshot.empty) {
            alert(`Cannot find your Username : ${username}, please Sign-up first! `);
            window.location.href = "signup.html";
            return;
        }


        let userData;
        querySnapshot.forEach((doc) => {
            userData = doc.data();
            localStorage.setItem("currentUser", JSON.stringify({ id: doc.id, data: userData }));
        });

        // validate user with their password
        if (userData.Password == password) {
            window.location.href = "main_page.html";
        } else {
            alert("Password is incorrect! Please try again");

        }

    } catch(error) {
        console.log("Error signing up");
    }
}

// Add participant function 
const selectedParticipants = [];

async function addParticipant() {
    const input = document.getElementById('user-input');
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
        await db.collection("Bills").add(billData);
        console.log("Bill added successfully!", billData);
        window.location.href = "main_page.html";
    } catch (error) {
        console.error("Error deleting user:", error);
    }
     
} 
