// import firebase from "firebase/compat/app";

// import { getDataConnect } from "firebase/data-connect";


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();


// add a single user with ({"Balance": 1, "Name": "Jason", Password: "2006", Spendings: [1, 2, 3, 4]});
async function addUser(userData) {
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
            window.href.location = "login.html";
            return;
        }


        // Retrieve user details from Firestore
        addUser({"Balance": balance, "Name": username, "Password": password, Spendings: [0, 0, 0, 0]})
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
