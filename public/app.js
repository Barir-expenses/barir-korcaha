// -------------------------------------------------------------
// 1. SUPABASE CONFIGURATION (Direct Client Setup)
// -------------------------------------------------------------
const SUPABASE_URL = "https://your-supabase-url.supabase.co"; // <-- Apni URL Daalein
const SUPABASE_ANON_KEY = "your-supabase-anon-key";          // <-- Apni Anon Key Daalein

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Page Load hote hi standard setup Run karein
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('expense_date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    loadExpenses();
});

// -------------------------------------------------------------
// 2. EXPENSES FETCH & DISPLAY FUNCTION
// -------------------------------------------------------------
async function loadExpenses() {
    try {
        const { data, error } = await supabaseClient
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('expenseList');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data && data.length > 0) {
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
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Abhi tak koi expense add nahi hua.</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading expenses:", err);
        const tbody = document.getElementById('expenseList');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Database Error: ${err.message}</td></tr>`;
        }
    }
}

// -------------------------------------------------------------
// 3. EXPENSE SAVE FUNCTION (POST Logic)
// -------------------------------------------------------------
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = document.getElementById('amount').value;
        const title = document.getElementById('title').value;
        const expense_date = document.getElementById('expense_date').value;

        try {
            const { error } = await supabaseClient
                .from('expenses')
                .insert([{ amount: parseFloat(amount), title, expense_date }]);

            if (error) throw error;

            // Input Fields Clear Karein
            document.getElementById('amount').value = '';
            document.getElementById('title').value = '';
            
            // Table Refresh Karein
            loadExpenses();
        } catch (err) {
            console.error("Save Error:", err);
            alert(`Expense Save Nahi Hua: ${err.message}`);
        }
    });
}

// -------------------------------------------------------------
// 4. PDF REPORT GENERATOR & DOWNLOAD FUNCTION
// -------------------------------------------------------------
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
        const month = document.getElementById('pdfMonth').value;
        const year = document.getElementById('pdfYear').value;

        try {
            let query = supabaseClient.from('expenses').select('*');

            // Month aur Year Filtering Logic
            if (year && month) {
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
                query = query.gte('expense_date', startDate).lte('expense_date', endDate);
            } else if (year) {
                query = query.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);
            }

            const { data, error } = await query.order('expense_date', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                alert('Chune hue Month/Year me koi expense nahi mila.');
                return;
            }

            // Client-Side Browser PDF Generation
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const reportTitle = month && year 
                ? `Monthly Expense Report (${month}/${year})`
                : `Yearly Expense Report (${year || 'All Time'})`;

            doc.setFontSize(18);
            doc.text(reportTitle, 14, 20);

            let totalAmount = 0;
            const rows = data.map((item, idx) => {
                totalAmount += Number(item.amount);
                return [idx + 1, item.expense_date, item.title, `Rs. ${Number(item.amount).toFixed(2)}`];
            });

            // AutoTable plugin se report format karein
            doc.autoTable({
                startY: 28,
                head: [['#', 'Date', 'Expense Name', 'Amount']],
                body: rows,
            });

            const finalY = doc.lastAutoTable.finalY || 40;
            doc.setFontSize(14);
            doc.text(`Total Expense: Rs. ${totalAmount.toFixed(2)}`, 14, finalY + 12);

            // Direct PDF Download trigger karein
            doc.save(`Expense_Report_${month || 'All'}_${year || 'Time'}.pdf`);

        } catch (err) {
            console.error("PDF Error:", err);
            alert(`PDF Generate nahi ho paya: ${err.message}`);
        }
    });
}
