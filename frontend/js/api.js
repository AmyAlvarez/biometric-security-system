// Shared helper functions for calling the FastAPI backend
export async function fetchUsers() {
    const response = await fetch("/users", { headers: { Accept: "application/json" } });
    if (!response.ok) {
        throw new Error(`Users request failed (${response.status})`);
    }
    return response.json();
}

export async function enrollUser(employee) {
    const response = await fetch("/users", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(employee),
    });
    if (response.status === 409) {
        throw new Error("That employee ID already exists. Go back to change it.");
    }
    if (!response.ok) {
        throw new Error("Couldn't save the employee. Your details are still here. Try again.");
    }
    return response.json();
}

function userUrl(employeeId) {
    const pathId = employeeId === "." || employeeId === ".." ? employeeId + " " : employeeId;
    return `/users/${encodeURIComponent(pathId)}`;
}

export async function changePermission(employeeId, accessLevel) {
    const response = await fetch(userUrl(employeeId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_level: accessLevel }),
    });
    if (!response.ok) {
        throw new Error(response.status === 404
            ? "This user is no longer in the directory. Refresh the page to update the list."
            : "Couldn't save the permission. Try again.");
    }
    return response.json();
}

export async function removeUser(employeeId) {
    const response = await fetch(userUrl(employeeId), { method: "DELETE" });
    if (!response.ok) {
        throw new Error(response.status === 404
            ? "This user is no longer in the directory. Refresh the page to update the list."
            : "Couldn't remove the user. Try again.");
    }
}
