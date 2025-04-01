// import firebase from "firebase/compat/app";

// import { getDataConnect } from "firebase/data-connect";


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
export const db = firebase.firestore();




const API_URL = "http://localhost:3000";



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
            return;
        }



        
       
  
        // Retrieve user details from Firestore
        addUser({"Balance": balance, "Name": username, "Password": password, Spendings: [0, 0, 0, 0]})
        alert("Sign-up Successful! You can login now");
        // window.location.href = "index.html";

        
        
        

        
  
        
        // window.location.href = "main_page.html"; 
  
        
        
      } catch (error) {
        console.error("Sign up Failed:", error.message);
        // alert("Login failed: " + error.message);
      }
    
    

    // try {
    //     const response = await fetch(`${API_URL}/signup`, {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ username, password })
    //     });

    //     const result = await response.json();
    //     console.log("Result:", result); 

    //     if (response.ok) {
    //         message.style.color = "green";
    //         message.innerText = "Signup successful! Redirecting...";
    //         setTimeout(() => window.location.href = "login.html", 1000);
    //     } else {
    //         message.style.color = "red";
    //         message.innerText = result.message;
    //     }
    // } catch (error) {
    //     console.error("Error:", error);
    //     message.style.color = "red";
    //     message.innerText = "Signup request failed!";
    // }
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
            
            return;
        }

        window.location.href = "main_page.html"; 



        querySnapshot.forEach((doc) => {
            console.log("User Found:", doc.id, doc.data());
        });

    } catch(error) {
        console.log("Error signing up");
    }
}
