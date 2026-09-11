// Credentials (Apni Supabase URL & Anon Key yaha daalein)
const SUPABASE_URL = "https://gmsapmodgwhmsgmgdzfm.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtc2FwbW9kZ3dobXNnbWdkemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTEyMzAsImV4cCI6MjEwNDYyNzIzMH0.XJm5a28xV-wF9_y7F4q8JiS73Ui8rFIczUDb63WJ1RM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('expense_date').valueAsDate = new Date();
    loadExpenses();

    // 3-Line Menu Drawer Controls
    const drawer = document.getElementById('drawerMenu');
    document.getElementById('menuToggle').addEventListener('click', () => drawer.classList.add('active'));
    document.getElementById('closeDrawer').addEventListener('click', () => drawer.classList.remove('active'));
});

// Expenses Fetch Logic
async function loadExpenses() {
    try {
        const { data, error } = await supabaseClient
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('expenseList');
        tbody.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.expense_date}</td>
                        <td>${item.title}</td>
                        <td><strong>₹${Number(item.amount).toFixed(2)}</strong></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No records found.</td></tr>`;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// Save Expense Logic
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const title = document.getElementById('title').value;
    const expense_date = document.getElementById('expense_date').value;

    try {
        const { error } = await supabaseClient
            .from('expenses')
            .insert([{ amount: parseFloat(amount), title, expense_date }]);

        if (error) throw error;

        document.getElementById('amount').value = '';
        document.getElementById('title').value = '';
        loadExpenses();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

// Professional PDF Report Generator (Indigo & Slate Theme)
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
    const month = document.getElementById('pdfMonth').value;
    const year = document.getElementById('pdfYear').value;

    try {
        let query = supabaseClient.from('expenses').select('*');

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
            alert('Selected duration ke liye koi data nahi milaa.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const periodText = month ? `${monthNames[month]} ${year}` : `Year ${year || 'All Time'}`;

        // 1. TOP BRANDING HEADER (Gradient Style - Deep Indigo)
        doc.setFillColor(30, 27, 75); // Dark Indigo
        doc.rect(0, 0, 210, 40, 'F');

        // Accent Line
        doc.setFillColor(99, 102, 241); // Vibrant Indigo Accent
        doc.rect(0, 38, 210, 2, 'F');

        // Brand Name & Subtitle
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("BARIR KORCHA", 14, 22);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(199, 210, 254);
        doc.text("MONTHLY EXPENSE STATEMENT", 14, 30);

        // Right Header Stamp/Tag
        doc.setFillColor(49, 46, 129);
        doc.roundedRect(140, 12, 56, 16, 4, 4, 'F');
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(224, 231, 255);
        doc.text("OFFICIAL REPORT", 147, 22);

        // 2. METRIC SUMMARY CARDS
        let totalAmount = 0;
        const rows = data.map((item, idx) => {
            totalAmount += Number(item.amount);
            return [
                idx + 1, 
                item.expense_date, 
                item.title, 
                `Rs. ${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ];
        });

        // Left Card: Period Info
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 48, 88, 22, 3, 3, 'FD');

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("STATEMENT PERIOD", 20, 55);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(periodText, 20, 64);

        // Right Card: Total Amount Highlight
        doc.setFillColor(254, 242, 242); // Soft Light Red Container
        doc.setDrawColor(254, 202, 202);
        doc.roundedRect(108, 48, 88, 22, 3, 3, 'FD');

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28);
        doc.text("TOTAL EXPENSE SPENT", 114, 55);
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38); // Crimson Red
        doc.text(`Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 114, 64);

        // 3. TABLE STYLING
        doc.autoTable({
            startY: 78,
            head: [['#', 'Date', 'Category / Details', 'Amount']],
            body: rows,
            theme: 'grid',
            headStyles: { 
                fillColor: [67, 56, 202], // Premium Indigo
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left'
            },
            bodyStyles: { 
                fontSize: 9, 
                textColor: [51, 65, 85],
                cellPadding: 4
            },
            alternateRowStyles: { 
                fillColor: [248, 250, 252] 
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 35 },
                2: { cellWidth: 85 },
                3: { cellWidth: 47, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
            },
            gridLineColor: [226, 232, 240],
            lineWidth: 0.1,
            margin: { left: 14, right: 14 }
        });

        // 4. FOOTER & PAGE NUMBERS
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer Divider
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 280, 196, 280);

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated automatically by Barir Korcha • ${new Date().toLocaleDateString()}`, 14, 286);
            doc.text(`Page ${i} of ${pageCount}`, 180, 286);
        }

        doc.save(`Barir_Korcha_Statement_${month || 'All'}_${year}.pdf`);
        document.getElementById('drawerMenu').classList.remove('active');

    } catch (err) {
        alert(`PDF Error: ${err.message}`);
    }
});
