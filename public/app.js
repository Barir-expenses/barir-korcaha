// Credentials
const SUPABASE_URL = "https://gmsapmodgwhmsgmgdzfm.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtc2FwbW9kZ3dobXNnbWdkemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTEyMzAsImV4cCI6MjEwNDYyNzIzMH0.XJm5a28xV-wF9_y7F4q8JiS73Ui8rFIczUDb63WJ1RM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editingExpenseId = null;
let allCategorySuggestions = [];

// Helper function: Simple Expense ID formatting (EXP-1, EXP-2 format without leading zeros)
function formatExpId(rawId, defaultIndex) {
    if (!rawId) return `EXP-${defaultIndex}`;
    
    // Convert string number or EXP-001 to simple integer string
    const cleanNum = rawId.toString().replace(/[^0-9]/g, '');
    if (cleanNum) {
        return `EXP-${parseInt(cleanNum, 10)}`;
    }
    return `EXP-${defaultIndex}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const expenseDateInput = document.getElementById('expense_date');
    if (expenseDateInput) expenseDateInput.valueAsDate = new Date();
    
    const yearInput = document.getElementById('pdfYear');
    if (yearInput) yearInput.value = new Date().getFullYear();

    const monthSelect = document.getElementById('pdfMonth');
    if (monthSelect) monthSelect.value = new Date().getMonth() + 1;

    const specificDateInput = document.getElementById('pdfSpecificDate');
    if (specificDateInput) specificDateInput.valueAsDate = new Date();

    loadExpenses();
    loadExpenseSuggestions();

    const drawer = document.getElementById('drawerMenu');
    const menuToggle = document.getElementById('menuToggle');
    const closeDrawer = document.getElementById('closeDrawer');

    if (menuToggle && drawer) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            drawer.classList.add('active');
        });
    }

    if (closeDrawer && drawer) {
        closeDrawer.addEventListener('click', (e) => {
            e.stopPropagation();
            drawer.classList.remove('active');
        });
    }

    const reportTypeSelect = document.getElementById('reportType');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', handleReportTypeToggle);
        handleReportTypeToggle();
    }

    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            loadExpenses();
            loadExpenseSuggestions();
        });
    }

    // CUSTOM DROPDOWN INTERACTION LISTENERS
    const titleInput = document.getElementById('title');
    const dropdown = document.getElementById('customDropdown');

    if (titleInput && dropdown) {
        titleInput.addEventListener('focus', () => {
            if (allCategorySuggestions.length > 0) {
                renderCustomDropdown(allCategorySuggestions);
                dropdown.style.display = 'block';
            }
        });

        titleInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = allCategorySuggestions.filter(item => 
                item.title.toLowerCase().includes(query) || 
                item.expId.toLowerCase().includes(query)
            );
            renderCustomDropdown(filtered);
            dropdown.style.display = filtered.length > 0 ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (!titleInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
});

function handleReportTypeToggle() {
    const reportTypeSelect = document.getElementById('reportType');
    const monthlyGroup = document.getElementById('monthlyGroup');
    const yearlyGroup = document.getElementById('yearlyGroup');
    const specificDateGroup = document.getElementById('specificDateGroup');

    if (!reportTypeSelect) return;

    const val = reportTypeSelect.value;

    if (monthlyGroup) monthlyGroup.style.display = (val === 'monthly') ? 'block' : 'none';
    if (yearlyGroup) yearlyGroup.style.display = (val === 'monthly' || val === 'yearly') ? 'block' : 'none';
    if (specificDateGroup) specificDateGroup.style.display = (val === 'specific') ? 'block' : 'none';
}

function getTableName() {
    const categorySelect = document.getElementById('category');
    const selectedCategory = categorySelect ? categorySelect.value : 'GENERAL';
    return (selectedCategory === 'HOME') ? 'home_expenses' : 'expenses';
}

// RECENT EXPENSES LIST (TOP 10 ENTRIES)
async function loadExpenses() {
    try {
        const tableName = getTableName();
        
        const [resMaster, resExpenses] = await Promise.all([
            supabaseClient.from('expense_master_summary').select('title, expense_id'),
            supabaseClient.from(tableName).select('*').order('expense_date', { ascending: false }).limit(10)
        ]);
        
        if (resExpenses.error) throw resExpenses.error;
        
        const masterMap = {};
        if (resMaster.data) {
            resMaster.data.forEach((m, idx) => {
                masterMap[m.title.trim().toUpperCase()] = formatExpId(m.expense_id, idx + 1);
            });
        }
        
        const tbody = document.getElementById('expenseList');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const data = resExpenses.data || [];
        
        if (data.length > 0) {
            data.forEach((item, idx) => {
                const titleKey = item.title.trim().toUpperCase();
                const expId = masterMap[titleKey] || `EXP-${idx + 1}`;
                const categoryBadge = tableName === 'home_expenses' ? '🏠 House' : '🛒 Daily';
                
                tbody.innerHTML += `
                    <tr>
                        <td style="white-space: nowrap;">${item.expense_date}</td>
                        <td>
                            <strong style="color: #6366f1; font-size: 0.82rem;">[${expId}]</strong>
                        </td>
                        <td>
                            <span style="font-weight: 600; font-size: 0.92rem; color: #0f172a;">${item.title}</span><br>
                            <small style="color:#64748b; font-weight:700; font-size: 0.72rem;">${categoryBadge}</small>
                        </td>
                        <td class="amount-td">₹${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No records found.</td></tr>`;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}
// DROPDOWN DATA FETCHING & RENDERER (USING SIMPLE EXP-1, EXP-2)
async function loadExpenseSuggestions() {
    try {
        const tableName = getTableName();

        const [resMaster, resExpenses] = await Promise.all([
            supabaseClient.from('expense_master_summary').select('title, expense_id'),
            supabaseClient.from(tableName).select('title, amount')
        ]);

        if (resExpenses.error) throw resExpenses.error;

        const masterMap = {};
        if (resMaster.data) {
            resMaster.data.forEach((m, idx) => {
                masterMap[m.title.trim().toUpperCase()] = formatExpId(m.expense_id, idx + 1);
            });
        }

        allCategorySuggestions = [];
        if (resExpenses.data && resExpenses.data.length > 0) {
            const categoryTotals = {};

            resExpenses.data.forEach(item => {
                const title = item.title.trim();
                const amount = Number(item.amount) || 0;
                categoryTotals[title] = (categoryTotals[title] || 0) + amount;
            });

            Object.keys(categoryTotals).forEach((title, idx) => {
                const titleKey = title.toUpperCase();
                const expId = masterMap[titleKey] || `EXP-${idx + 1}`;
                allCategorySuggestions.push({
                    title: title,
                    expId: expId,
                    totalSpent: categoryTotals[title]
                });
            });
        }
        renderCustomDropdown(allCategorySuggestions);
    } catch (err) {
        console.error("Suggestions Fetch Error:", err);
    }
}

function renderCustomDropdown(items) {
    const dropdown = document.getElementById('customDropdown');
    if (!dropdown) return;

    if (items.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = '';
    items.forEach(item => {
        const formattedTotal = item.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const row = document.createElement('div');
        row.className = 'dropdown-item-row';
        row.style.cssText = `
            padding: 10px 14px;
            cursor: pointer;
            border-bottom: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #1e293b;
        `;

        row.innerHTML = `
            <div>
                <span style="color: #ef4444; font-weight: 800; font-size: 0.85rem; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 6px; margin-right: 8px;">[${item.expId}]</span>
                <span style="color: #ffffff; font-weight: 600; font-size: 0.95rem;">${item.title}</span>
            </div>
            <div style="color: #94a3b8; font-size: 0.8rem; font-weight: 600;">₹${formattedTotal}</div>
        `;

        row.addEventListener('click', () => {
            const titleInput = document.getElementById('title');
            if (titleInput) {
                titleInput.value = item.title;
            }
            dropdown.style.display = 'none';
        });

        dropdown.appendChild(row);
    });
}

// FORM SUBMISSION
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('amount').value;
        const rawTitle = document.getElementById('title').value.trim();
        const expense_date = document.getElementById('expense_date').value;
        const tableName = getTableName();

        if (!amount || !rawTitle || !expense_date) {
            alert("Kripya saare fields bharein.");
            return;
        }

        try {
            if (editingExpenseId) {
                const { error } = await supabaseClient
                    .from(tableName)
                    .update({ amount: parseFloat(amount), title: rawTitle, expense_date })
                    .eq('id', editingExpenseId);

                if (error) throw error;
                editingExpenseId = null;

                const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Save Expense';
            } else {
                const { error } = await supabaseClient
                    .from(tableName)
                    .insert([{ amount: parseFloat(amount), title: rawTitle, expense_date }]);

                if (error) throw error;
            }

            document.getElementById('amount').value = '';
            document.getElementById('title').value = '';
            
            loadExpenses();
            loadExpenseSuggestions();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    });
}

async function loadFontAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// PDF GENERATOR
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
        const reportTypeSelect = document.getElementById('reportType');
        const monthSelect = document.getElementById('pdfMonth');
        const yearInput = document.getElementById('pdfYear');
        const specificDateInput = document.getElementById('pdfSpecificDate');

        const reportType = reportTypeSelect ? reportTypeSelect.value : 'monthly';
        const month = monthSelect ? monthSelect.value : '';
        const year = yearInput ? yearInput.value : '';
        const targetDate = specificDateInput ? specificDateInput.value : '';

        try {
            let qDaily = supabaseClient.from('expenses').select('*');
            let qHome = supabaseClient.from('home_expenses').select('*');
            let qMaster = supabaseClient.from('expense_master_summary').select('*');
            let periodText = '';
            let fileName = '';

            if (reportType === 'specific') {
                if (!targetDate) { alert('Kripya specific date select karein.'); return; }
                qDaily = qDaily.eq('expense_date', targetDate);
                qHome = qHome.eq('expense_date', targetDate);
                
                const dObj = new Date(targetDate);
                periodText = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                fileName = `BARIR_KORCHA_DATE_${targetDate}.pdf`;
            } else if (reportType === 'monthly') {
                if (!year || !month) { alert('Kripya Month aur Year select karein.'); return; }
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
                
                qDaily = qDaily.gte('expense_date', startDate).lte('expense_date', endDate);
                qHome = qHome.gte('expense_date', startDate).lte('expense_date', endDate);

                const monthNames = ["", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
                periodText = `${monthNames[month]} ${year}`;
                fileName = `BARIR_KORCHA_${monthNames[month]}_${year}.pdf`;
            } else {
                if (!year) { alert('Kripya Year enter karein (e.g. 2026).'); return; }
                qDaily = qDaily.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);
                qHome = qHome.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);
                periodText = `YEAR ${year}`;
                fileName = `BARIR_KORCHA_${year}.pdf`;
            }

            const [resDaily, resHome, resMaster] = await Promise.all([qDaily, qHome, qMaster]);

            if (resDaily.error) throw resDaily.error;
            if (resHome.error) throw resHome.error;

            const dailyData = resDaily.data || [];
            const homeData = resHome.data || [];
            const masterMap = {};

            if (resMaster.data) {
                resMaster.data.forEach((m, idx) => {
                    masterMap[m.title.trim().toUpperCase()] = formatExpId(m.expense_id, idx + 1);
                });
            }

            if (dailyData.length === 0 && homeData.length === 0) {
                alert(`Selected duration ke liye koi records nahi mile.`);
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });

            try {
                const fontBoldBase64 = await loadFontAsBase64("https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-700-normal.ttf");
                doc.addFileToVFS('PlusJakartaSans-Bold.ttf', fontBoldBase64);
                doc.addFont('PlusJakartaSans-Bold.ttf', 'PlusJakartaSans', 'bold');
                doc.setFont("PlusJakartaSans", "bold");
            } catch (fErr) {
                doc.setFont("helvetica", "bold");
            }

            const activeFont = doc.getFont().fontName;
            const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
            const docRef = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

            const processGroup = (items) => {
                const map = {};
                let total = 0;
                items.forEach(item => {
                    const titleKey = item.title.trim().toUpperCase();
                    const amt = Number(item.amount) || 0;
                    total += amt;
                    if (!map[titleKey]) {
                        map[titleKey] = { totalAmount: 0, count: 0, rawTitle: item.title.trim() };
                    }
                    map[titleKey].totalAmount += amt;
                    map[titleKey].count += 1;
                });
                return { map, total };
            };

            const dailyGroup = processGroup(dailyData);
            const homeGroup = processGroup(homeData);
            const grandTotal = dailyGroup.total + homeGroup.total;

            let maxExpenseAmount = 0;
            [...Object.values(dailyGroup.map), ...Object.values(homeGroup.map)].forEach(item => {
                if (item.totalAmount > maxExpenseAmount) maxExpenseAmount = item.totalAmount;
            });

            // HEADER
            doc.setFillColor(15, 23, 42); 
            doc.rect(0, 0, 210, 5, 'F');
            doc.setFillColor(16, 185, 129); 
            doc.rect(0, 5, 210, 1.5, 'F');

            doc.setFont(activeFont, "bold");
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); 
            doc.text("BARIR KORCHA", 14, 22);

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text("FINANCIAL STATEMENT & LEDGER REPORT", 14, 27);

            // META CARD
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.roundedRect(128, 12, 68, 22, 3, 3, 'FD');

            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text("STATEMENT DATE", 132, 18);
            doc.text("GENERATED ON", 132, 23);
            doc.text("REFERENCE NO", 132, 28);

            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(periodText, 163, 18);
            doc.text(generatedDate, 163, 23);
            doc.text(docRef, 163, 28);

            // KPI CARDS
            const rx = 3;

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, 38, 56, 20, rx, rx, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text("DAILY HOUSEHOLD TOTAL", 18, 44);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(`₹${dailyGroup.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 18, 52);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(76, 38, 56, 20, rx, rx, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(99, 102, 241);
            doc.text("HOUSE CONST. TOTAL", 80, 44);
            doc.setFontSize(11);
            doc.setTextColor(67, 56, 202);
            doc.text(`₹${homeGroup.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 80, 52);

            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(254, 202, 202);
            doc.roundedRect(138, 38, 58, 20, rx, rx, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(153, 27, 27);
            doc.text("TOTAL COMBINED NET", 142, 44);
            doc.setFontSize(11);
            doc.setTextColor(185, 28, 28);
            doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 142, 52);

            let currentY = 67;

            // SECTION 1: DAILY
            if (Object.keys(dailyGroup.map).length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.text("DAILY HOUSEHOLD EXPENSES", 14, currentY);

                const dailyRows = Object.keys(dailyGroup.map).map((key, idx) => {
                    const item = dailyGroup.map[key];
                    const expId = masterMap[key] || `EXP-${idx + 1}`;
                    return [
                        expId,
                        item.rawTitle,
                        `${item.count} ${item.count > 1 ? 'Entries' : 'Entry'}`,
                        `₹${item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    ];
                });

                doc.autoTable({
                    startY: currentY + 3,
                    head: [['EXP ID', 'ITEMS & DESCRIPTION', 'FREQUENCY', 'AMOUNT (INR)']],
                    body: dailyRows,
                    theme: 'grid',
                    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', font: activeFont, fontSize: 8 },
                    bodyStyles: { font: activeFont, fontStyle: 'bold', fontSize: 8.5, textColor: [30, 41, 59] },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        0: { cellWidth: 20, halign: 'center', textColor: [100, 116, 139] },
                        1: { cellWidth: 98 },
                        2: { cellWidth: 30, halign: 'center' },
                        3: { cellWidth: 34, halign: 'right' }
                    },
                    didParseCell: function(dataCell) {
                        if (dataCell.section === 'body' && dataCell.column.index === 3) {
                            const rawText = dataCell.cell.raw.replace(/[^0-9.]/g, '');
                            if (parseFloat(rawText) === maxExpenseAmount && maxExpenseAmount > 0) {
                                dataCell.cell.styles.textColor = [185, 28, 28];
                            }
                        }
                    },
                    margin: { left: 14, right: 14 }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }

            // SECTION 2: HOUSE CONSTRUCTION
            if (Object.keys(homeGroup.map).length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(67, 56, 202);
                doc.text("HOUSE CONSTRUCTION EXPENSES", 14, currentY);

                const homeRows = Object.keys(homeGroup.map).map((key, idx) => {
                    const item = homeGroup.map[key];
                    const expId = masterMap[key] || `EXP-${idx + 1}`;
                    return [
                        expId,
                        item.rawTitle,
                        `${item.count} ${item.count > 1 ? 'Entries' : 'Entry'}`,
                        `₹${item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    ];
                });

                doc.autoTable({
                    startY: currentY + 3,
                    head: [['EXP ID', 'CONSTRUCTION MATERIAL / WORK', 'FREQUENCY', 'AMOUNT (INR)']],
                    body: homeRows,
                    theme: 'grid',
                    headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold', font: activeFont, fontSize: 8 },
                    bodyStyles: { font: activeFont, fontStyle: 'bold', fontSize: 8.5, textColor: [30, 41, 59] },
                    alternateRowStyles: { fillColor: [243, 244, 246] },
                    columnStyles: {
                        0: { cellWidth: 20, halign: 'center', textColor: [99, 102, 241] },
                        1: { cellWidth: 98 },
                        2: { cellWidth: 30, halign: 'center' },
                        3: { cellWidth: 34, halign: 'right' }
                    },
                    didParseCell: function(dataCell) {
                        if (dataCell.section === 'body' && dataCell.column.index === 3) {
                            const rawText = dataCell.cell.raw.replace(/[^0-9.]/g, '');
                            if (parseFloat(rawText) === maxExpenseAmount && maxExpenseAmount > 0) {
                                dataCell.cell.styles.textColor = [185, 28, 28];
                            }
                        }
                    },
                    margin: { left: 14, right: 14 }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }

            // GRAND TOTAL SUMMARY BAR
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, currentY, 182, 12, 2, 2, 'FD');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text("GRAND TOTAL SPENT", 20, currentY + 7.5);
            doc.setFontSize(10);
            doc.setTextColor(185, 28, 28);
            doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 188, currentY + 7.5, { align: 'right' });

            // FOOTER
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor(226, 232, 240);
                doc.line(14, 276, 196, 276);
                doc.setFontSize(7.5);
                doc.setFont(activeFont, "bold");
                doc.setTextColor(148, 163, 184);
                doc.text("CONFIDENTIAL  |  GENERATED VIA BARIR KORCHA SYSTEM", 14, 282);
                doc.text(`PAGE ${i} OF ${pageCount}`, 196, 282, { align: 'right' });
            }

            doc.save(fileName);

            const drawer = document.getElementById('drawerMenu');
            if (drawer) drawer.classList.remove('active');

        } catch (err) {
            alert(`PDF Error: ${err.message}`);
        }
    });
