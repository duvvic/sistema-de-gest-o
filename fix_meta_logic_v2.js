const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// Use a more robust regex for the memo
const memoRegex = /const capacityStats = useMemo\(\(\) => \{[\s\S]*?\}, \[capacityMonth, holidays, absences, userId, formData\.dailyAvailableHours\]\);/;
const memoReplacement = `const capacityStats = useMemo(() => {
      const dailyMeta = Number(String(formData.dailyAvailableHours).replace(',', '.')) || 8;
      const userAbsences = (absences || []).filter((a: any) => String(a.userId) === String(userId));
      const [yearText, monthText] = capacityMonth.split('-');
      const yearNum = Number(yearText);
      const monthNum = Number(monthText);

      const monthStart = \`\${yearText}-\${monthText}-01\`;
      const lastDayDate = new Date(yearNum, monthNum, 0);
      const monthEnd = \`\${yearText}-\${monthText}-\${String(lastDayDate.getDate()).padStart(2, '0')}\`;

      // Cálculo Infalível de Dias Brutos (Seg-Sex)
      let totalGrossWorkingDays = 0;
      const daysInMonth = lastDayDate.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
         const day = new Date(yearNum, monthNum - 1, i).getDay();
         if (day !== 0 && day !== 6) totalGrossWorkingDays++;
      }

      const totalWorkingDays = CapacityUtils.getWorkingDaysInRange(monthStart, monthEnd, holidays || [], userAbsences, dailyMeta);
      const calculatedTotal = dailyMeta * totalGrossWorkingDays;

      const heatmap = CapacityUtils.getWorkingDaysBreakdown(monthStart, monthEnd, holidays || [], userAbsences, dailyMeta);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const isCurrentMonth = todayStr.startsWith(capacityMonth);
      const residualStart = (isCurrentMonth && todayStr > monthStart) ? todayStr : monthStart;

      const finalResidualDays = CapacityUtils.getWorkingDaysInRange(residualStart, monthEnd, holidays || [], userAbsences, dailyMeta);
      const calculatedResidual = dailyMeta * finalResidualDays;

      return { totalWorkingDays, totalGrossWorkingDays, calculatedTotal, heatmap, monthStart, monthEnd, userAbsences, dailyMeta, isCurrentMonth, residualStart, finalResidualDays, calculatedResidual };
   }, [capacityMonth, holidays, absences, userId, formData.dailyAvailableHours]);`;

if (memoRegex.test(content)) {
    content = content.replace(memoRegex, memoReplacement);
    console.log('Memo updated with foolproof calculation');
}

// Update the input display to be cleaner
content = content.replace(
    /value=\{monthlyHoursMode === 'auto'\r?\n\s+\? formatDecimalToTime\(capacityStats\.calculatedTotal\)\.replace\(':', '\.'\)\r?\n\s+: \(formData\.monthlyAvailableHours \?\? ''\)\}/,
    `value={monthlyHoursMode === 'auto'
                                                   ? formatDecimalToTime(capacityStats.calculatedTotal).replace(':', '.')
                                                   : (formData.monthlyAvailableHours ?? '')}`
);

// Ensure the label clearly shows the calculation result to debug
content = content.replace(
    /TOTAL: <span className="underline decoration-dotted underline-offset-2">\{capacityStats\.totalGrossWorkingDays\} DIAS<\/span>/,
    `META: <span className="underline decoration-dotted underline-offset-2">{capacityStats.totalGrossWorkingDays} DIAS × {capacityStats.dailyMeta}H = {capacityStats.calculatedTotal}H</span>`
);

fs.writeFileSync(path, content);
console.log('Patch finished');
