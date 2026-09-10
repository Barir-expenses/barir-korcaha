// Set Default Date to Today on Page Load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('expense_date').valueAsDate = new Date();
    loadExpenses();
});

// 1. Fetch & Display Expenses History Table
async function loadExpenses() {
    try {
        const res = await fetch('/api/expenses');
        const data = await res.json();
        const tbody = document.getElementById('expenseList');
        tbody.innerHTML = '';

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.expense_date}</td>
                        <td>${item.title}</td>
                        <td>₹${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No expenses added yet.</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading expenses:", err);
    }
}

// 2. Add New Expense Form Event Listener
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const title = document.getElementById('title').value;
    const expense_date = document.getElementById('expense_date').value;

    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, title, expense_date })
        });

        if (res.ok) {
            document.getElementById('amount').value = '';
            document.getElementById('title').value = '';
            loadExpenses(); // Refresh Table
        } else {
            alert('Error saving expense. Check backend logs.');
        }
    } catch (err) {
        console.error("Error saving expense:", err);
    }
});

// 3. PDF Download Event Listener
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    const month = document.getElementById('pdfMonth').value;
    const year = document.getElementById('pdfYear').value;

    let url = `/api/pdf?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}`;

    // Open PDF API endpoint in new tab to start download
    window.open(url, '_blank');
});
