const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();


function showToast(message, toastT) {
  const toast = document.getElementById(toastT);
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  // Hide it after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
  }, 3000);
}



const usernameRef = document.getElementById("newUsername");
const passwordRef = document.getElementById("newPassword");
const balanceRef = document.getElementById("newBalance");

var usernameValid = false;
var passwordValid = false;
var balanceValid = false;


const usernameErrorRef = document.getElementById("username-error");
const passwordErrorRef = document.getElementById("password-error");
const balanceErrorRef = document.getElementById("balance-error");


function usernameValidation() {
    if (usernameRef.value.length >= 5) {
        usernameValid = true;
        return "";
    } else {
        return "Must be at least 5 characters long";
    }
}


function passwordValidation() {
    const password = passwordRef.value;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
        passwordValid = true;
        return "";
    } else {
        return "Should contain: upper case letter, smaller case letter, special character";
    }
}


function balanceValidation() {
    if (balanceRef.value > 0) {
        balanceValid = true;
        return "";
    } else {
        return "Enters a value greater than 0";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (usernameRef && passwordRef && balanceRef) { // signUp page
        usernameRef.addEventListener("input", ()=> {
            usernameErrorRef.textContent = usernameValidation();
        });

        passwordRef.addEventListener("input", ()=> {
            passwordErrorRef.textContent = passwordValidation();
        });

        balanceRef.addEventListener("input", ()=> {
            balanceErrorRef.textContent = balanceValidation();
        });
    }
});






async function addUser(userData) {
    console.log("in addUser");
    try {
        await db.collection("billsplitter_users").add(userData);
        console.log("User with userData added successfully!", userData);
    } catch (error) {
        console.error("Error deleting user:", error);
    }
}



async function signup(event) {
    event.preventDefault();

    if (!(usernameValid && passwordValid && balanceValid)) {
        showToast("Please follow the correct format to enter your information", "signup-success-toast");
        return;
    }

    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const balance = document.getElementById("newBalance").value;

    try {
        // Check if user already exist

        const usersRef = db.collection("billsplitter_users"); // Reference the "users" collection

        const snapshot = await usersRef.where("Name", "==", username).get()


        if (!snapshot.empty) {
            alert("User already exists");
            window.location.href = "login.html";
            return;
        }

        const spending_arr = new Array(7).fill(0);

        // Retrieve user details from Firestore
        await addUser({"Balance": balance, "Name": username, "Password": password, "Owed" : 0, "Own":0, Spendings: spending_arr});
        // upon sucess
        showToast("Sign-up Successful! You can login now");

        setTimeout(()=> {window.location.href = "login.html"}, 2500);
      } catch (error) {
        console.error("Sign up Failed:", error.message);
      }
}




async function login(event) {
    event.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    try {
        const querySnapshot = await db.collection("billsplitter_users").where("Name", "==", username).get();

        if (querySnapshot.empty) {
            showToast(`Cannot find your Username : ${username}, please Sign-up! Redirecting... `, "alert-toast");
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