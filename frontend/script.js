// ===============================
// Alfaraz Auto Spare Parts - Main Script
// ===============================

const API_BASE_URL = "https://alfaraz-auto-api.onrender.com";

// ===== Global variables for Shop/Cart =====
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
const userId = localStorage.getItem("userId");
const adminLoggedIn = localStorage.getItem("adminLoggedIn");

// ===============================
// PAGE LOAD HANDLER
// ===============================

window.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  // --- SIGNUP PAGE ---
  if (document.getElementById("signupForm")) {
    document
      .getElementById("signupForm")
      .addEventListener("submit", handleSignup);
  }

  // --- LOGIN PAGE ---
  if (document.getElementById("loginTabs")) {
    setupLoginTabs();
    document
      .getElementById("userForm")
      .addEventListener("submit", handleUserLogin);
    document
      .getElementById("adminForm")
      .addEventListener("submit", handleAdminLogin);
  }

  // --- SHOP PAGE ---
  if (document.getElementById("parts")) {
    fetchParts();
  }

  // --- CART PAGE ---
  if (document.getElementById("cartItems")) {
    renderCart();
    document
      .getElementById("checkoutBtn")
      .addEventListener("click", handleCheckout);
  }

  // --- ADMIN DASHBOARD ---
  if (document.getElementById("addPartForm")) {
    if (adminLoggedIn !== "true") {
      alert("Access denied! Admin not logged in.");
      window.location.href = "login.html";
      return;
    }

    loadAdminParts();
    loadAdminOrders();
    document
      .getElementById("addPartForm")
      .addEventListener("submit", handleAddPart);
  }
});

// ===============================
// AUTH FUNCTIONS (SIGNUP / LOGIN)
// ===============================

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return alert("Please enter a valid email.");
  if (password.length < 8)
    return alert("Password must be at least 8 characters.");

  try {
    const res = await fetch(`${API_BASE_URL}/user/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert(data.message);
      window.location.href = "login.html";
    }
  } catch {
    alert("Error connecting to server");
  }
}

async function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById("userEmail").value.trim();
  const password = document.getElementById("userPassword").value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert("User logged in successfully");
      localStorage.setItem("userId", data.userId);
      window.location.href = "shop.html";
    }
  } catch {
    alert("Error connecting to server");
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert("Admin logged in successfully");
      localStorage.setItem("adminLoggedIn", "true");
      window.location.href = "dashboard.html";
    }
  } catch {
    alert("Error connecting to server");
  }
}

function setupLoginTabs() {
  const userTab = document.getElementById("userTab");
  const adminTab = document.getElementById("adminTab");
  const userForm = document.getElementById("userForm");
  const adminForm = document.getElementById("adminForm");

  userTab.addEventListener("click", () => {
    userTab.classList.add("active");
    adminTab.classList.remove("active");
    userForm.style.display = "block";
    adminForm.style.display = "none";
  });

  adminTab.addEventListener("click", () => {
    adminTab.classList.add("active");
    userTab.classList.remove("active");
    adminForm.style.display = "block";
    userForm.style.display = "none";
  });
}

// ===============================
// SHOP FUNCTIONS
// ===============================

async function fetchParts() {
  try {
    const res = await fetch(`${API_BASE_URL}/parts`);
    const parts = await res.json();
    const partsDiv = document.getElementById("parts");

    // Clear any previous content or loading message
    partsDiv.innerHTML = "";

    // 1. Create a "holding pen" for our new elements
    const fragment = document.createDocumentFragment();

    parts.forEach((p) => {
      const col = document.createElement("div");
      col.className = "col-md-3 mb-4"; // Bootstrap grid column

      // Create product card
      col.innerHTML = `
        <div class="glass-card text-center d-flex flex-column p-4">
          <h5 class="shop-card-title">${p.name}</h5>
          <div class="mt-auto">
            <p class="shop-card-text shop-card-text-price mb-1">
              Price: $${p.price.toFixed(2)}
            </p>
            <p class="shop-card-text shop-card-text-stock mb-3">
              Stock: ${p.quantity}
            </p>
            <button
              class="btn btn-glass btn-glass-primary w-100"
              onclick="addToCart(${p.id}, '${p.name}', ${p.price}, ${
        p.quantity
      })"
            >
              Add to Cart
            </button>
          </div>
        </div>
      `;

      // 2. Add the new card to the "holding pen"
      fragment.appendChild(col);
    });

    // 3. Add all cards to the page at once (for better performance)
    partsDiv.appendChild(fragment);
  } catch (err) {
    alert("Error fetching parts from server");
  }
}

function addToCart(id, name, price, stock) {
  if (stock <= 0) return alert("Sorry, this item is out of stock.");

  const item = cart.find((i) => i.id === id);
  if (item) {
    if (item.quantity >= stock) return alert("No more items in stock.");
    item.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  alert(`${name} added to cart!`);
}

// ===============================
// CART FUNCTIONS
// ===============================

function renderCart() {
  const cartDiv = document.getElementById("cartItems");
  cartDiv.innerHTML = "";
  let total = 0;

  // 1. Create a "holding pen"
  const fragment = document.createDocumentFragment();

  // Show message if cart is empty
  if (cart.length === 0) {
    cartDiv.innerHTML = `
      <h4 class="dashboard-subtitle text-center">
        Your cart is empty.
      </h4>
    `;
    document.getElementById("totalPrice").innerText = "0.00";
    return;
  }

  // 2. Build cart items
  cart.forEach((item, index) => {
    total += item.price * item.quantity;

    const col = document.createElement("div");
    col.className = "col-md-4 mb-4";

    col.innerHTML = `
      <div class="glass-card text-center d-flex flex-column p-4">
        <h5 class="shop-card-title">${item.name}</h5>
        <div class="mt-auto">
          <p class="shop-card-text shop-card-text-price mb-1">
            Price: $${item.price.toFixed(2)}
          </p>
          <p class="shop-card-text mb-1">
            Quantity: ${item.quantity}
          </p>
          <p class="shop-card-subtotal mb-3">
            Subtotal: $${(item.price * item.quantity).toFixed(2)}
          </p>
          <button
            class="btn btn-glass btn-glass-danger w-100"
            onclick="removeFromCart(${index})"
          >
            Remove
          </button>
        </div>
      </div>
    `;

    // Add card to the fragment
    fragment.appendChild(col);
  });

  // 3. Add all cards to the page at once
  cartDiv.appendChild(fragment);

  // 4. Update total
  document.getElementById("totalPrice").innerText = total.toFixed(2);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

async function handleCheckout() {
  if (cart.length === 0) return alert("Your cart is empty!");

  const items = cart.map((item) => ({
    part_id: item.id,
    price: item.price,
    quantity: item.quantity,
  }));

  try {
    const res = await fetch(`${API_BASE_URL}/cart/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, items }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert(`Order placed successfully! Total: $${data.total.toFixed(2)}`);
      cart = [];
      localStorage.setItem("cart", JSON.stringify(cart));
      renderCart();
    }
  } catch {
    alert("Error connecting to server");
  }
}

// ===============================
// ADMIN DASHBOARD
// ===============================

async function loadAdminParts() {
  try {
    const res = await fetch(`${API_BASE_URL}/parts`);
    const data = await res.json();
    const table = document.getElementById("partsTable");
    table.innerHTML = "";

    data.forEach((p) => {
      table.innerHTML += `
        <tr>
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>${p.quantity}</td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="editPart(${
              p.id
            }, '${p.name}', ${p.price}, ${p.quantity})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deletePart(${
              p.id
            })">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch {
    alert("Error fetching parts");
  }
}

async function loadAdminOrders() {
  try {
    const res = await fetch(`${API_BASE_URL}/orders`);
    const data = await res.json();
    const table = document.getElementById("ordersTable");
    table.innerHTML = "";

    data.forEach((o) => {
      table.innerHTML += `
        <tr>
          <td>${o.id}</td>
          <td>${o.user_name || "N/A"} (ID: ${o.user_id})</td>
          <td>${o.quantity} x ${o.part_name || "N/A"}</td>
          <td>$${o.total_price.toFixed(2)}</td>
        </tr>
      `;
    });
  } catch {
    alert("Error fetching orders");
  }
}

async function handleAddPart(e) {
  e.preventDefault();
  const name = document.getElementById("partName").value.trim();
  const price = document.getElementById("partPrice").value.trim();
  const quantity = document.getElementById("partQty").value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, quantity }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert("Part added successfully!");
      loadAdminParts();
      e.target.reset();
    }
  } catch {
    alert("Error adding part");
  }
}

async function editPart(id, name, price, quantity) {
  const newName = prompt("Edit Part Name:", name);
  const newPrice = prompt("Edit Price:", price);
  const newQty = prompt("Edit Quantity:", quantity);
  if (!newName || !newPrice || !newQty) return;

  try {
    const res = await fetch(`${API_BASE_URL}/parts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        price: newPrice,
        quantity: newQty,
      }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert("Part updated successfully!");
      loadAdminParts();
    }
  } catch {
    alert("Error updating part");
  }
}

async function deletePart(id) {
  if (!confirm("Are you sure you want to delete this part?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/parts/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert("Part deleted successfully!");
      loadAdminParts();
    }
  } catch {
    alert("Error deleting part");
  }
}

// ===============================
// GLOBAL LOGOUT
// ===============================

function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("adminLoggedIn");
  localStorage.removeItem("cart");
  alert("Logged out successfully!");
  window.location.href = "login.html";
}
