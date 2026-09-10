// Page Load Hote Hi Standard Date Set Karein Aur Saved Data Load Karein
document.addEventListener('DOMContentLoaded', () => {
    // Expense Date Input Me Aaj Ki Date Set Karein
    const dateInput = document.getElementById('expense_date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // Server Se Purana Data Load Karein
    loadExpenses();
});

// 1. Backend API (/api/expenses) Se Expenses Fetch Karke Table Me Dikhana
async function loadExpenses() {
    try {
        const res = await fetch('/api/expenses');
        const data = await res.json();

        const tbody = document.getElementById('expenseList');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (res.ok && Array.isArray(data) && data.length > 0) {
            data.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.expense_date}</td>
                        <td>${item.title}</td>
                        <td>₹${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else if (data.error) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Error: ${data.error}</td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Abhi koi expense add nahi hua hai.</td></tr>`;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        const tbody = document.getElementById('expenseList');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Failed to connect to backend server.</td></tr>`;
        }
    }
}

// 2. Form Submit Event (Naya Expense Save Karne Ke Liye)
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
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

            const result = await res.json();

            if (res.ok) {
                // Inputs Clear Karein
                document.getElementById('amount').value = '';
                document.getElementById('title').value = '';
                
                // Table Fresh Data Ke Saath Reload Karein
                loadExpenses();
            } else {
                alert(`Error: ${result.error || 'Expense save nahi ho paya!'}`);
            }
        } catch (err) {
            console.error("Save Error:", err);
            alert('Network Error: Server connect nahi ho raha hai.');
        }
    });
}

// 3. PDF Download Button Click Event (Month/Year Wise Export)
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        const month = document.getElementById('pdfMonth').value;
        const year = document.getElementById('pdfYear').value;

        let url = `/api/pdf?`;
        if (month) url += `month=${month}&`;
        if (year) url += `year=${year}`;

        // Vercel Serverless Function /api/pdf Ko Open Karke PDF Download Start Karein
        window.open(url, '_blank');
    });
}
