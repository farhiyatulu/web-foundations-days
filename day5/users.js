const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const list = document.querySelector("#users-list");

let allUsers = []; // stores the loaded users

function renderUsers(usersToShow) {
  list.innerHTML = ""; // clear old items

  usersToShow.forEach((user) => {
    const li = document.createElement("li");
    li.textContent =
      `${user.name} - ${user.email} - ${user.address.city} - ${user.company.name}`;
    list.appendChild(li);
  });
}

async function loadUsers() {
  statusText.textContent = "Loading users...";
  loadBtn.disabled = true;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    allUsers = await response.json();
    filterInput.value = "";
    renderUsers(allUsers);
    statusText.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    statusText.textContent = "Could not load users. Please try again.";
    console.error(error);
  } finally {
    loadBtn.disabled = false; // runs on success and on failure
  }
}

loadBtn.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  if (allUsers.length === 0) return; // nothing loaded yet

  const text = filterInput.value.trim().toLowerCase();
  const matches = allUsers.filter((user) =>
    user.name.toLowerCase().includes(text)
  );

  renderUsers(matches);

  if (matches.length === 0) {
    statusText.textContent = "No users match your filter.";
  } else {
    statusText.textContent = `Showing ${matches.length} of ${allUsers.length} users.`;
  }
});