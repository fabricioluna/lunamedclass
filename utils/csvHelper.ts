export const parseResilientCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // Ignora a próxima aspa (escaped quote)
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ';' && !insideQuotes) {
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      currentLine.push(currentCell.trim());
      // Só adiciona a linha se não estiver vazia
      if (currentLine.join('').trim() !== '') {
        result.push(currentLine);
      }
      currentLine = [];
      currentCell = '';
      if (char === '\r') i++; // Ignora o \n se for \r\n
    } else {
      // Ignora standalone \r fora de aspas
      if (char !== '\r' || insideQuotes) { 
        currentCell += char;
      }
    }
  }
  
  // Captura a última célula/linha caso o arquivo não termine com quebra de linha
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.join('').trim() !== '') {
      result.push(currentLine);
    }
  }

  return result;
};