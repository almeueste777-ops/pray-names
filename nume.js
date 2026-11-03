// Dicționar de prenume românești cu sex (m/f). Folosit la regula „două nume pe un rând, același sex → doar primul".
// Export dublu: browser (window.NUME) și Node (module.exports).
const MASCULINE = `
Adrian Alex Alexandru Alin Andrei Anton Antonie Antoniu Arsenie Augustin Aurel Aurelian Avram
Benedict Beniamin Bogdan Bucur
Călin Camil Cătălin Cezar Ciprian Claudiu Codrin Codruț Constantin Corneliu Cornel Cosmin Costache Costel Costică Costin Cristi Cristian Cristea Cristinel
Dan Daniel Dănuț Darius David Decebal Denis Dimitrie Dinu Dorel Dorin Doru Dragoș Dumitru
Edmond Eduard Efrem Emanuel Emil Emilian Eremia Eric Ernest Eugen Eusebiu
Fabian Felix Filip Flavius Florea Florentin Florian Florin Francisc
Gabriel Gavril Gelu Gheorghe George Georgel Georgian Ghiță Gică Gigel Grigore
Horia Horațiu
Iacob Ieremia Ilie Ioan Ion Ionel Ionică Ionuț Iosif Irinel Iulian Iuliu Iustin Ivan
Jan Jean
Ladislau Laurențiu Laurian Lazăr Leon Leonard Leontin Liviu Lorin Luca Lucian Ludovic
Manole Marcel Marian Marin Marius Martin Matei Maxim Maximilian Mihai Mihail Mihnea Mircea Miron Mitică Mugur
Narcis Neculai Nelu Nicolae Nicu Nicolaie Nicușor Norbert
Octav Octavian Olimpiu Ovidiu
Pamfil Pantelimon Paul Pavel Petre Petrică Petru Petrișor Puiu
Radu Rareș Raul Răzvan Relu Remus Robert Romeo Romulus Rusalin
Sabin Samuel Sandu Sava Sebastian Sergiu Sever Silviu Simion Sorin Spiridon Stan Stancu Stelian Ștefan Șerban
Tănase Teodor Teofil Tiberiu Titus Toader Toma Traian Tudor
Valentin Valeriu Valer Vasile Vicențiu Victor Viorel Virgil Vlad Vladimir Vlăduț
Zaharia Zamfir
`;
const FEMININE = `
Ada Adela Adelina Adina Adriana Agata Agnes Alexandra Alexia Alina Amalia Ana Anamaria Anca Anda Andra Andreea Andreia Aneta Angela Angelica Anghelina Anica Anișoara Antonia Antoaneta Aurelia Aurica Aurora
Beatrice Bianca Brândușa
Camelia Carla Carmen Carolina Casandra Catinca Cătălina Cecilia Cezara Claudia Clara Codruța Constanța Consuela Corina Cornelia Cosmina Crina Cristina
Dafina Daiana Dana Daniela Daria Delia Denisa Diana Didina Dimitrina Doina Domnica Dorina Dumitra
Ecaterina Elena Eleonora Eliza Elisabeta Elvira Emanuela Emilia Erika Estera Eufrosina Eugenia Eva Evelina
Felicia Filofteia Flavia Floarea Florentina Florica Florina Frusina
Gabriela Geanina Georgeta Georgiana Geta Gherghina Gina Giorgiana Grațiela
Ilaria Ileana Ilinca Ilona Ina Ioana Iolanda Ionela Irina Iris Isabela Iulia Iuliana Iustina Izabela
Jana Jenica
Larisa Laura Lavinia Lenuța Leontina Letiția Lidia Liliana Lili Livia Loredana Lorena Lucia Luciana Lucreția Ludmila Luiza Luminița
Mădălina Magdalena Maia Malina Manuela Mara Marcela Margareta Maria Mariana Marilena Marina Marinela Marta Melania Mihaela Milena Minodora Mioara Mirela Miruna Monica
Nadia Narcisa Natalia Nicoleta Nina Norica
Oana Octavia Olga Olimpia Olivia Otilia
Paraschiva Patricia Paula Paulina Petra Petruța Profira
Rada Rafila Raluca Ramona Rebeca Renata Roberta Rodica Romanița Roxana Ruxandra
Sabina Safta Sanda Sara Saveta Savina Silvia Silviana Simona Sofia Sonia Sorina Speranța Stana Stanca Steliana Stela Steluța Ștefana Ștefania Suzana Svetlana
Tamara Tania Tatiana Teodora Teona Tinca Tudora
Valentina Valeria Valerica Vasilica Vasilena Veronica Veta Victoria Viorica Violeta Virginia Vera
Zamfira Zenovia Zina Zoe Zoia
`;
function split(s) { return s.split(/\s+/).filter(Boolean); }
const NUME = { m: split(MASCULINE), f: split(FEMININE) };
NUME.sex = new Map();
for (const n of NUME.m) NUME.sex.set(n.toLowerCase(), 'm');
for (const n of NUME.f) NUME.sex.set(n.toLowerCase(), 'f');
NUME.toate = [...NUME.m, ...NUME.f];
if (typeof module !== 'undefined') module.exports = NUME;
if (typeof window !== 'undefined') window.NUME = NUME;
