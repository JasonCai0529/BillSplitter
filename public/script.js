const API_URL = "http://localhost:3000";


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhUAaEU2vCHzQz_NhUnNtJkGzDwIRZ1ts",
  authDomain: "cs222-billsplitter.firebaseapp.com",
  projectId: "cs222-billsplitter",
  storageBucket: "cs222-billsplitter.firebasestorage.app",
  messagingSenderId: "844280482186",
  appId: "1:844280482186:web:401546dd3ae2a35fbca073",
  measurementId: "G-D453TN7056"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);






// Signup function
async function signup(event) {
    event.preventDefault(); 

    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const message = document.getElementById("message");

    console.log("Signing up with:", username, password);



    try {
        // Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, username, password);
        const user = userCredential.user;
  
        // Retrieve user details from Firestore
        const userRef = doc(db, "billsplitter_users", user.uid); // Assuming "users" collection stores user info
        const userSnap = await getDoc(userRef);

        
  
        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log("User Data:", userData);
  
          // Update HTML elements dynamically
        //   document.querySelector(".profile-card").innerHTML = `
        //     <h2>${userData.name}</h2>
        //     <p>Email: ${user.email}</p>
        //     <p>Role: ${userData.role}</p>
        //   `;

        window.location.href = "main_page.html"; 
  
        } else {
          console.log("User data not found in Firestore");
        }
        
      } catch (error) {
        console.error("Login Failed:", error.message);
        alert("Login failed: " + error.message);
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
    const message = document.getElementById("message");

    console.log("Logging in with:", username, password); 

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        console.log("Login result:", result.success);
        console.log("RESPONSE status IS: ", response.status);

        if (result.success == false) { // if cannot found user in the database
            message.style.color = "red";
            message.innerText = result.message;
        } else if (response.ok) {
            sessionStorage.setItem("username", username); 
            // alert(`Login successful! Your balance: $${result.balance}`);
            window.location.href = "main_page.html"; 
        } else {
            message.style.color = "red";
            message.innerText = result.message;
        }
        
        
    } catch (error) {
        console.error("Error:", error);
        message.style.color = "red";
        message.innerText = "Login request failed!";
    }
}
