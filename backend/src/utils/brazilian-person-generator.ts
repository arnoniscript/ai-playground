/**
 * Brazilian Person Generator
 * Generates fake Brazilian person data with valid CPF, names, phone numbers, etc.
 */

export interface BrazilianPerson {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  sexo: "Masculino" | "Feminino";
  telefone: string;
}

// Common Brazilian first names
const FIRST_NAMES_MALE = [
  "João", "Pedro", "Lucas", "Gabriel", "Matheus", "Rafael", "Felipe", "Bruno",
  "Guilherme", "Thiago", "Vitor", "Carlos", "Diego", "Rodrigo", "Fernando",
  "Daniel", "Marcelo", "André", "Ricardo", "Paulo", "Leonardo", "Gustavo",
  "Henrique", "Caio", "Eduardo", "Renan", "Victor", "Leandro", "Marcos",
];

const FIRST_NAMES_FEMALE = [
  "Maria", "Ana", "Beatriz", "Julia", "Laura", "Mariana", "Fernanda", "Camila",
  "Amanda", "Isabela", "Leticia", "Gabriela", "Carolina", "Juliana", "Patricia",
  "Daniela", "Bruna", "Priscila", "Vanessa", "Tatiana", "Aline", "Renata",
  "Bianca", "Larissa", "Jessica", "Natalia", "Rafaela", "Adriana", "Luciana",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves",
  "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho",
  "Rocha", "Almeida", "Nascimento", "Araujo", "Melo", "Barbosa", "Cardoso",
  "Correia", "Dias", "Fernandes", "Freitas", "Monteiro", "Mendes", "Moreira",
  "Nunes", "Pinto", "Ramos", "Reis", "Santana", "Teixeira", "Vieira",
];

// Brazilian DDD (area codes)
const DDDS = [
  "11", "12", "13", "14", "15", "16", "17", "18", "19", // São Paulo
  "21", "22", "24", // Rio de Janeiro
  "27", "28", // Espírito Santo
  "31", "32", "33", "34", "35", "37", "38", // Minas Gerais
  "41", "42", "43", "44", "45", "46", // Paraná
  "47", "48", "49", // Santa Catarina
  "51", "53", "54", "55", // Rio Grande do Sul
  "61", // Distrito Federal
  "62", "64", // Goiás
  "63", // Tocantins
  "65", "66", // Mato Grosso
  "67", // Mato Grosso do Sul
  "68", // Acre
  "69", // Rondônia
  "71", "73", "74", "75", "77", // Bahia
  "79", // Sergipe
  "81", "87", // Pernambuco
  "82", // Alagoas
  "83", // Paraíba
  "84", // Rio Grande do Norte
  "85", "88", // Ceará
  "86", "89", // Piauí
  "91", "93", "94", // Pará
  "92", "97", // Amazonas
  "95", // Roraima
  "96", // Amapá
  "98", "99", // Maranhão
];

/**
 * Generates a valid Brazilian CPF using the official algorithm
 */
export function generateCPF(): string {
  // Generate first 9 random digits
  const cpfArray = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  );

  // Calculate first verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += cpfArray[i] * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  digit1 = digit1 >= 10 ? 0 : digit1;
  cpfArray.push(digit1);

  // Calculate second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += cpfArray[i] * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  digit2 = digit2 >= 10 ? 0 : digit2;
  cpfArray.push(digit2);

  // Format CPF: XXX.XXX.XXX-XX
  const cpfString = cpfArray.join("");
  return `${cpfString.slice(0, 3)}.${cpfString.slice(3, 6)}.${cpfString.slice(
    6,
    9
  )}-${cpfString.slice(9, 11)}`;
}

/**
 * Generates a random birth date for an adult (18-70 years old)
 */
export function generateBirthDate(): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  const minAge = 18;
  const maxAge = 70;

  const birthYear =
    currentYear - minAge - Math.floor(Math.random() * (maxAge - minAge));
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1; // Use 28 to avoid month-specific logic

  const month = birthMonth.toString().padStart(2, "0");
  const day = birthDay.toString().padStart(2, "0");

  return `${day}/${month}/${birthYear}`;
}

/**
 * Generates a random Brazilian phone number with DDD
 */
export function generatePhone(): string {
  const ddd = DDDS[Math.floor(Math.random() * DDDS.length)];
  const firstDigit = Math.random() > 0.5 ? "9" : "8"; // Mobile numbers start with 9 or 8
  const remainingDigits = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");

  return `(${ddd}) ${firstDigit}${remainingDigits.slice(
    0,
    4
  )}-${remainingDigits.slice(4)}`;
}

/**
 * Generates a random Brazilian person name
 */
export function generateName(
  gender: "Masculino" | "Feminino"
): string {
  const firstNames =
    gender === "Masculino" ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName1 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const lastName2 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

  return `${firstName} ${lastName1} ${lastName2}`;
}

/**
 * Generates a complete Brazilian person with all data
 */
export function generateBrazilianPerson(): BrazilianPerson {
  const sexo: "Masculino" | "Feminino" =
    Math.random() > 0.5 ? "Masculino" : "Feminino";

  return {
    nome_completo: generateName(sexo),
    cpf: generateCPF(),
    data_nascimento: generateBirthDate(),
    sexo,
    telefone: generatePhone(),
  };
}
