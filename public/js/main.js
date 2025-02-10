// Calculate 1RM function
const calculate1rm = (weight, reps) => Math.round(weight * (1 + reps / 30));

document.addEventListener("DOMContentLoaded", function () {
  function getLiftsAndFillTable() {
    fetch("/getLifts")
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(data => {
        const tableBody = document.querySelector("table tbody");
        tableBody.innerHTML = ""; 
        data.forEach(item => {
          if (item.lift && item.reps && item.weight) {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td data-field="exercise">${item.lift}</td>
              <td contenteditable="true" data-field="reps">${item.reps}</td>
              <td contenteditable="true" data-field="weight">${item.weight}</td>
              <td data-field="projected_1rm">${calculate1rm(item.weight, item.reps)}</td>
              <td>
                <button class="delete-btn">X</button>
              </td>
            `;
            tableBody.appendChild(row);
          }
        });
      })
      .catch(error => console.error("Error fetching lifts data:", error));
  }

  function extractRowData(row) {
    return {
      exercise: row.children[0].textContent.trim(), 
      reps: parseInt(row.children[1].textContent.trim(), 10),
      weight: parseFloat(row.children[2].textContent.trim()),
      projected_1rm: parseFloat(row.children[3].textContent.trim())
    };
  }

  // Delete lift record
  async function deleteExercise(rowData, rowElement) {
    try {
      const response = await fetch("/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rowData)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      rowElement.remove();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      alert("Failed to delete exercise.");
    }
  }

  // Update lift record
  async function updateExercise(rowData) {
    try {
      const response = await fetch("/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rowData)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Refresh table to show updated data
      getLiftsAndFillTable();
    } catch (error) {
      console.error("Error updating exercise:", error);
      alert("Failed to update exercise.");
    }
  }


  document.querySelector("table tbody").addEventListener("click", function (event) {
    const rowElement = event.target.closest("tr");
    if (!rowElement) return;

    if (event.target.classList.contains("delete-btn")) {
      const rowData = extractRowData(rowElement);
      deleteExercise(rowData, rowElement);
    }
  });

  document.querySelector("table tbody").addEventListener("blur", function (event) {
    const cell = event.target;
    if (cell.tagName === "TD" && cell.hasAttribute("contenteditable")) {
      const rowElement = cell.closest("tr");
      const rowData = extractRowData(rowElement);
      updateExercise(rowData);
    }
  }, true);


  const form = document.getElementById("dataForm");
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

   
    const exercise = document.getElementById("exercise").value.trim();
    const reps = document.getElementById("reps").value.trim();
    const weight = document.getElementById("weight").value.trim();

    if (!exercise || !reps || !weight || isNaN(reps) || isNaN(weight)) {
      alert("Please enter valid values for exercise, Reps (number), and Weight (number).");
      return;
    }

    const workoutData = {
      exercise: exercise, 
      reps: parseInt(reps, 10),
      weight: parseFloat(weight)
    };

    try {
      const response = await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workoutData)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      form.reset();
      getLiftsAndFillTable();
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to submit workout data.");
    }
  });


  async function getUserData() {
    try {
      const response = await fetch("/getUserData");
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      const userData = await response.json();
      document.getElementById("user-name").textContent = `${userData.firstName} ${userData.lastName}`;
      document.getElementById("user-email").textContent = `Email: ${userData.email}`;
      document.getElementById("user-bodyweight").textContent = `Bodyweight: ${userData.bodyweight} lbs`;
      document.getElementById("user-username").textContent = `Username: ${userData.username}`;
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }


  getLiftsAndFillTable();
  getUserData();
});

//Login
async function handleLogin(event) {
  event.preventDefault(); // Prevent default form submission

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (response.ok) {
      alert("Login successful");
      window.location.href = result.redirect; 
    } else {
      alert(result.message || "Invalid username or password");
    }
  } catch (error) {
    console.error("Error during login:", error);
    alert("Login failed.");
  }
}

// Attach login event handler if a login form exists
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
});
