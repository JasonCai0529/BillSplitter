const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();


function showToast(message) {
  const toast = document.getElementById("toast");
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
        return "Must contains at least one: upper case letter, smaller case letter, special character";
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

usernameRef.addEventListener("input", ()=> {
    usernameErrorRef.textContent = usernameValidation();
})

passwordRef.addEventListener("input", ()=> {
    passwordErrorRef.textContent = passwordValidation();
})

balanceRef.addEventListener("input", ()=> {
    balanceErrorRef.textContent = balanceValidation();
})



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
        showToast("Please follow the correct format to enter your information");
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