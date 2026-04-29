import * as fs from 'fs';
import path from 'path';

const inputPath = path.join(
    __dirname,
    '..',
    'results',
    'grouped_instructors.json'
);
const outputPath = path.join(
    __dirname,
    '..',
    'results',
    'grouped_instructors_filtered.json'
);

const grouped = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

function getFirstName(fullName: string): string {
    const parts = fullName.split(',');
    if (parts.length < 2) return '';
    return parts[1].trim().split(' ')[0].replace('.', '');
}

function getFullFirstName(fullName: string): string {
    const parts = fullName.split(',');
    if (parts.length < 2) return '';
    return parts[1].trim();
}

function areLikelySamePerson(name1: string, name2: string): boolean {
    const f1 = getFirstName(name1).toLowerCase();
    const f2 = getFirstName(name2).toLowerCase();

    const full1 = getFullFirstName(name1).toLowerCase();
    const full2 = getFullFirstName(name2).toLowerCase();

    if (f1 === f2) return true;

    // Nicknames/Common variants
    const nicknames: Record<string, string[]> = {
        gabriel: ['gabe'],
        robert: ['bob', 'rob', 'robby', 'bobby'],
        william: ['bill', 'will', 'billy', 'willy'],
        james: ['jim', 'jimmy'],
        richard: ['dick', 'rick', 'richy'],
        thomas: ['tom', 'tommy'],
        stephen: ['steve', 'steven'],
        steve: ['steven'],
        nicholas: ['nick'],
        kenneth: ['ken'],
        gregory: ['greg'],
        andrew: ['andy', 'aj'],
        matthew: ['matt'],
        philip: ['phil'],
        zachary: ['zach'],
        benjamin: ['ben'],
        christopher: ['chris'],
        joseph: ['joe'],
        anthony: ['tony', 'aj'],
        alexander: ['alex'],
        samuel: ['sam'],
        michael: ['mike'],
        daniel: ['dan'],
        timothy: ['tim'],
        ronald: ['ron'],
        arthur: ['art'],
        kathryn: ['katie', 'katy', 'kathy'],
        katherine: ['katie', 'katy', 'kathy'],
        margaret: ['peggy', 'maggie'],
        elizabeth: ['liz', 'beth', 'eliza'],
        miriam: ['maria'], // As per user's "Mendoza" example
        aj: ['andrew', 'anthony', 'andrew j', 'anthony j'],
    };

    if (nicknames[f1] && nicknames[f1].includes(f2)) return true;
    if (nicknames[f2] && nicknames[f2].includes(f1)) return true;

    // Initial check (e.g., "J." vs "John")
    if (f1.length === 1 && full2.startsWith(f1)) return true;
    if (f2.length === 1 && full1.startsWith(f2)) return true;

    // Substring match for cases like "Maria Elena" and "Miriam" (if we want to be permissive)
    // The user specifically mentioned keeping Mendoza, Miriam E. and Maria Elena
    if (full1.includes(f2) || full2.includes(f1)) return true;

    return false;
}

const filtered: Record<string, string[]> = {};

Object.keys(grouped).forEach((lastName) => {
    const instructors = grouped[lastName];

    // We want to find clusters of people who seem to be the same.
    // For simplicity, if ANY two in the group seem to be different, we need to decide if we keep a sub-group or delete.
    // The user said "if they dont seem to be the same person, delete it."
    // This implies we only want groups where everyone is likely the same person.

    let allSame = true;
    for (let i = 0; i < instructors.length; i++) {
        for (let j = i + 1; j < instructors.length; j++) {
            if (!areLikelySamePerson(instructors[i], instructors[j])) {
                allSame = false;
                break;
            }
        }
        if (!allSame) break;
    }

    if (allSame) {
        filtered[lastName] = instructors;
    } else {
        // Try to find if there's a majority group or if we should just discard.
        // Given the prompt "if they dont seem to be the same person, delete it",
        // I'll be strict: if the group has obviously different people, I delete the group.
        // However, some groups might have 10 people and only 1 is different.
        // But let's follow the user's instruction.
    }
});

fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2));
console.log(
    `Filtered from ${Object.keys(grouped).length} groups to ${Object.keys(filtered).length} groups.`
);
