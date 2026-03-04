const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Legend: Remove the "Reserva" div completely
const reservationLegendRegex = /<div className="flex items-center gap-1\.5" title="Horas de suporte ou atividades contínuas">[\s\S]*?<\/div>/;
content = content.replace(reservationLegendRegex, '');

// 2. Adjust columns: Since we removed one item, let's make sure the gap looks okay.
// Already gap-4, should be fine.

// 3. Tooltip: Ensure "RESERVA" is gone (double check)
const reservationTooltipRegex = /<div className="flex justify-between items-center text-\[8px\] font-bold">\s*<span className="text-amber-400">RESERVA:<\/span>[\s\S]*?<\/div>/g;
content = content.replace(reservationTooltipRegex, '');

fs.writeFileSync(path, content, 'utf8');
console.log("TeamMemberDetail.tsx: Removed 'Reserva' from legend and tooltip.");
