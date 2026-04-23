export function stripMiddleName(name: string): string {
    const commaIdx = name.indexOf(',');
    if (commaIdx !== -1) {
        const lastName = name.slice(0, commaIdx).trim();
        const firstToken = name
            .slice(commaIdx + 1)
            .trim()
            .split(/\s+/)[0];
        return `${lastName}, ${firstToken}`;
    }
    const parts = name.trim().split(/\s+/);
    return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
}

export function normalizeInstructorName(name: string): string {
    return stripMiddleName(name).toLowerCase().replace(/\s+/g, ' ').trim();
}
