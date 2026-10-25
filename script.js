
/* =================================
   MASROFY — APP LOGIC
================================= */

document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector) => document.querySelector(selector);

    // Storage keys
    const PROFILE_KEY = "masrofyUserProfile";
    const TRANSACTIONS_KEY = "masrofyTransactions";
    const GOAL_KEY = "masrofyFinancialGoal";

    // Profile elements
    const profileModal = $("#profileModal");
    const profileForm = $("#profileForm");
    const profileName = $("#profileName");
    const profileImage = $("#profileImage");
    const profileBackground = $("#profileBackground");
    const profileGreeting = $("#profileGreeting");
    const editProfileBtn = $("#editProfileBtn");
    const cancelProfileBtn = $("#cancelProfileBtn");

    // Transaction elements
    const transactionForm = $("#transactionForm");
    const transactionTitle = $("#transactionTitle");
    const transactionAmount = $("#transactionAmount");
    const transactionType = $("#transactionType");
    const transactionList = $("#transactionList");

    // Goal elements
    const goalForm = $("#goalForm");
    const goalAmountInput = $("#goalAmount");
    const goalStatus = $("#goalStatus");
    const goalPercent = $("#goalPercent");
    const goalProgressFill = $("#goalProgressFill");
    const goalProgressTrack = $("#goalProgressTrack");
    const goalRemaining = $("#goalRemaining");

    // Dashboard elements
    const totalBalanceElement = $("#totalBalance");
    const totalIncomeElement = $("#totalIncome");
    const totalExpensesElement = $("#totalExpenses");
    const transactionCount = $("#transactionCount");

    // Read JSON safely
    function readJSON(key, fallback) {
        try {
            const value = localStorage.getItem(key);

            if (value === null) {
                return fallback;
            }

            return JSON.parse(value);
        } catch (error) {
            console.error(`Could not read ${key}`, error);
            return fallback;
        }
    }

    // Load saved data
    let profile = readJSON(PROFILE_KEY, null);
    let transactions = readJSON(TRANSACTIONS_KEY, []);
    let financialGoal = readJSON(GOAL_KEY, 0);

    if (!Array.isArray(transactions)) {
        transactions = [];
    }

    transactions = transactions.filter((transaction) => {
        return (
            transaction &&
            typeof transaction.title === "string" &&
            Number.isFinite(Number(transaction.amount)) &&
            Number(transaction.amount) > 0 &&
            ["income", "expense"].includes(transaction.type)
        );
    });

    financialGoal = Number(financialGoal);

    if (!Number.isFinite(financialGoal) || financialGoal < 0) {
        financialGoal = 0;
    }

    // Save data locally
    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Could not save ${key}`, error);
            return false;
        }
    }

    // Currency formatter
    function formatMoney(amount) {
        return new Intl.NumberFormat("en-EG", {
            style: "currency",
            currency: "EGP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // =================================
    // PROFILE
    // =================================

    function displayProfile() {
        const name = profile?.name || "User";

        profileGreeting.textContent = `Hello, ${name} 👋`;

        if (profile?.image) {
            profileBackground.src = profile.image;
            profileBackground.classList.add("has-image");
        } else {
            profileBackground.removeAttribute("src");
            profileBackground.classList.remove("has-image");
        }
    }

    function openProfileEditor() {
        profileName.value = profile?.name || "";
        profileImage.value = "";
        profileModal.hidden = false;
        profileName.focus();
    }

    editProfileBtn.addEventListener("click", openProfileEditor);

    cancelProfileBtn.addEventListener("click", () => {
        if (profile?.name) {
            profileModal.hidden = true;
        }
    });

    // Compress the chosen image to reduce storage usage
    function resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = () => {
                reject(new Error("Could not read the selected image."));
            };

            reader.onload = () => {
                const image = new Image();

                image.onerror = () => {
                    reject(new Error("Could not open the selected image."));
                };

                image.onload = () => {
                    const maxDimension = 1400;

                    const scale = Math.min(
                        1,
                        maxDimension / Math.max(image.width, image.height)
                    );

                    const canvas = document.createElement("canvas");

                    canvas.width = Math.max(
                        1,
                        Math.round(image.width * scale)
                    );

                    canvas.height = Math.max(
                        1,
                        Math.round(image.height * scale)
                    );

                    const context = canvas.getContext("2d");

                    if (!context) {
                        reject(new Error("Image processing is unavailable."));
                        return;
                    }

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    resolve(canvas.toDataURL("image/jpeg", 0.78));
                };

                image.src = reader.result;
            };

            reader.readAsDataURL(file);
        });
    }

    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = profileName.value.trim();
        const file = profileImage.files[0];

        if (!name) {
            alert("Please enter your name.");
            return;
        }

        if (file && !file.type.startsWith("image/")) {
            alert("Please choose a valid image.");
            return;
        }

        const saveButton = profileForm.querySelector(
            'button[type="submit"]'
        );

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            let image = profile?.image || "";

            if (file) {
                image = await resizeImage(file);
            }

            const updatedProfile = { name, image };

            if (!saveJSON(PROFILE_KEY, updatedProfile)) {
                throw new Error("Browser storage is unavailable or full.");
            }

            profile = updatedProfile;
            displayProfile();
            profileModal.hidden = true;

        } catch (error) {
            console.error(error);

            alert(
                "Couldn't save your profile. Try a smaller image or free some browser storage."
            );
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Profile";
        }
    });

    // Show profile or ask for first-time setup
    displayProfile();

    if (!profile?.name) {
        openProfileEditor();
    }

    // =================================
    // TRANSACTIONS
    // =================================

    function calculateTotals() {
        let income = 0;
        let expenses = 0;

        transactions.forEach((transaction) => {
            const amount = Number(transaction.amount);

            if (transaction.type === "income") {
                income += amount;
            } else {
                expenses += amount;
            }
        });

        return {
            income,
            expenses,
            balance: income - expenses
        };
    }

    function renderTransactions() {
        transactionList.replaceChildren();

        transactionCount.textContent =
            `${transactions.length} ${transactions.length === 1 ? "item" : "items"}`;

        if (transactions.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";

            const icon = document.createElement("span");
            icon.className = "empty-icon";
            icon.textContent = "◈";

            const heading = document.createElement("h3");
            heading.textContent = "No transactions yet";

            const description = document.createElement("p");
            description.textContent =
                "Add your first transaction to get started.";

            emptyState.append(icon, heading, description);
            transactionList.appendChild(emptyState);

            return;
        }

        // Show newest transactions first
        [...transactions].reverse().forEach((transaction) => {
            const isIncome = transaction.type === "income";

            const item = document.createElement("article");
            item.className = "transaction-item";

            const symbol = document.createElement("div");
            symbol.className =
                `transaction-symbol ${transaction.type}`;
            symbol.textContent = isIncome ? "↗" : "↘";

            const info = document.createElement("div");
            info.className = "transaction-info";

            const title = document.createElement("h3");

            // textContent keeps user-entered text from being treated as HTML
            title.textContent = transaction.title;

            const date = document.createElement("p");

            const parsedDate = new Date(transaction.date);

            date.textContent = Number.isNaN(parsedDate.getTime())
                ? ""
                : parsedDate.toLocaleDateString("en-EG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });

            info.append(title, date);

            const right = document.createElement("div");
            right.className = "transaction-right";

            const amount = document.createElement("span");
            amount.className =
                `transaction-amount ${transaction.type}`;

            amount.textContent =
                `${isIncome ? "+" : "−"}${formatMoney(Number(transaction.amount))}`;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "delete-btn";
            deleteButton.textContent = "×";
            deleteButton.setAttribute(
                "aria-label",
                `Delete ${transaction.title}`
            );

            deleteButton.addEventListener("click", () => {
                const confirmed = confirm(
                    `Delete "${transaction.title}"?`
                );

                if (!confirmed) {
                    return;
                }

                const previousTransactions = transactions;

                transactions = transactions.filter(
                    (item) => item.id !== transaction.id
                );

                if (!saveJSON(TRANSACTIONS_KEY, transactions)) {
                    transactions = previousTransactions;
                    alert("Couldn't save this change.");
                    return;
                }

                renderApp();
            });

            right.append(amount, deleteButton);
            item.append(symbol, info, right);
            transactionList.appendChild(item);
        });
    }

    transactionForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const title = transactionTitle.value.trim();
        const amount = Number(transactionAmount.value);
        const type = transactionType.value;

        if (!title) {
            alert("Please enter a transaction name.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            alert("Please enter an amount greater than zero.");
            return;
        }

        if (!["income", "expense"].includes(type)) {
            alert("Please select a valid transaction type.");
            return;
        }

        const transaction = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            title,
            amount,
            type,
            date: new Date().toISOString()
        };

        transactions.push(transaction);

        if (!saveJSON(TRANSACTIONS_KEY, transactions)) {
            transactions.pop();
            alert("Couldn't save the transaction. Browser storage may be full.");
            return;
        }

        transactionForm.reset();
        transactionType.value = "income";

        renderApp();
    });

    // =================================
    // FINANCIAL GOAL
    // =================================

    goalForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const target = Number(goalAmountInput.value);

        if (!Number.isFinite(target) || target <= 0) {
            alert("Please enter a goal greater than zero.");
            return;
        }

        if (!saveJSON(GOAL_KEY, target)) {
            alert("Couldn't save your goal.");
            return;
        }

        financialGoal = target;
        renderApp();
    });

    function renderGoal(balance) {
        goalAmountInput.value = financialGoal > 0
            ? String(financialGoal)
            : "";

        if (financialGoal <= 0) {
            goalStatus.textContent = "Set a goal to get started";
            goalPercent.textContent = "0%";
            goalRemaining.textContent =
                "Your progress will appear here.";

            goalProgressFill.style.width = "0%";
            goalProgressTrack.setAttribute("aria-valuenow", "0");

            return;
        }

        // Only positive balance counts toward the goal
        const savedAmount = Math.max(0, balance);
        const progress = Math.min(
            100,
            (savedAmount / financialGoal) * 100
        );

        const remaining = Math.max(
            0,
            financialGoal - savedAmount
        );

        goalStatus.textContent =
            `${formatMoney(savedAmount)} saved toward ${formatMoney(financialGoal)}`;

        goalPercent.textContent = `${Math.floor(progress)}%`;
        goalProgressFill.style.width = `${progress}%`;

        goalProgressTrack.setAttribute(
            "aria-valuenow",
            String(Math.round(progress))
        );

        if (remaining === 0) {
            goalRemaining.textContent =
                "🎉 Goal reached! Great job tracking your money.";
        } else {
            goalRemaining.textContent =
                `${formatMoney(remaining)} left to reach your goal.`;
        }
    }

    // =================================
    // DASHBOARD RENDER
    // =================================

    function renderApp() {
        const totals = calculateTotals();

        totalBalanceElement.textContent = formatMoney(totals.balance);
        totalIncomeElement.textContent = formatMoney(totals.income);
        totalExpensesElement.textContent = formatMoney(totals.expenses);

        totalBalanceElement.style.color =
            totals.balance < 0 ? "var(--red)" : "var(--text)";

        renderTransactions();
        renderGoal(totals.balance);
    }

    renderApp();
});
