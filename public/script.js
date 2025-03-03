const API_URL = "http://localhost:3000";

// Signup function
async function signup(event) {
    event.preventDefault(); 

    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const message = document.getElementById("message");

    console.log("Signing up with:", username, password); 

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        console.log("Result:", result); 

        if (response.ok) {
            message.style.color = "green";
            message.innerText = "Signup successful! Redirecting...";
            setTimeout(() => window.location.href = "login.html", 1000);
        } else {
            message.style.color = "red";
            message.innerText = result.message;
        }
    } catch (error) {
        console.error("Error:", error);
        message.style.color = "red";
        message.innerText = "Signup request failed!";
    }
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
        console.log("Login result:", result);

        if (response.ok) {
            sessionStorage.setItem("username", username); 
            //save for later
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
