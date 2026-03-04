const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Legend: Remove the "Reserva" entry
// Search for the specific Reserva block that survived
const reservaLegend = /<div className="flex items-center gap-1\.5" title="Horas em atividades contínuas">[\s\S]*?<span className="text-\[9px\] font-black uppercase text-\[var\(--muted\)\]">Reserva<\/span>[\s\S]*?<\/div>/;
content = content.replace(reservaLegend, '');

// 2. Adjust tooltips titles for better clarity
content = content.replace(/Visão granular do fluxo de trabalho/g, 'Frequência e Ocupação Mensal');

fs.writeFileSync(path, content, 'utf8');
console.log("TeamMemberDetail.tsx: Removed 'Reserva' from legend for good.");
