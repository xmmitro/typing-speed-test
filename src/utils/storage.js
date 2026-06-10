// Save to storage
export function saveToLocalstorage(key, value) {
  try {
    const serializedValue =
      typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error saving key "${key}" to localStorage:`, error);
  }
}

export function getFromLocalstorage(key) {
  try {
    const item = localStorage.getItem(key);

    if (item === null) return null;

    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    return null;
  }
}
