// Dashboard logic: list, add, remove users; show logs
import { changePermission, fetchUsers, removeUser } from "./api.js";
import { setupEnrollment } from "./enrollment.js";

const byId = (id) => document.getElementById(id);
const directory = byId("directory");
const details = byId("details");
const search = byId("search");
const rows = byId("user-rows");
const state = byId("directory-state");
const message = byId("directory-message");
const retry = byId("retry");
const resultCount = byId("result-count");
const rowTemplate = byId("user-row");
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }); // UTC to preserve stored day
const nameOrder = new Intl.Collator("en-US", { sensitivity: "base" });
const actionForm = byId("user-action-form");
const permission = actionForm.elements.namedItem("permission");
const accessLabels = new Map(
    [...permission.options].map((option) => [option.value, option.textContent])
);

let users = [];
let selectedUser;

function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function badge(text, kind) {
    const element = document.createElement("span");
    element.className = `badge badge-${kind}`;
    const dot = document.createElement("img");
    dot.src = `/static/assets/dot-${kind}.svg`;
    dot.alt = "";
    dot.width = 6;
    dot.height = 6;
    element.append(dot, text);
    return element;
}

function enrollmentBadge(user) {
    return user.enrollment_status === "enrolled"
        ? badge("Enrolled", "enrolled")
        : badge("Pending face enrollment", "none");
}

function permissionBadge(user) {
    const level = user.access_level;
    return badge(accessLabels.get(level), level === "none" ? "none" : "access");
}

function showDetails(user) {
    selectedUser = user;
    byId("crumb-name").textContent = user.name;
    byId("record-crumb").hidden = false;
    const heading = byId("detail-name");
    heading.textContent = user.name;
    byId("detail-initials").textContent = initials(user.name);
    byId("detail-id").textContent = user.employee_id;
    byId("detail-status").replaceChildren(enrollmentBadge(user));
    byId("detail-profile").textContent = user.enrollment_status === "enrolled"
        ? "Enrolled"
        : "Pending face enrollment";
    byId("detail-date").textContent = user.enrolled_on
        ? dateFormat.format(new Date(user.enrolled_on))
        : "—";
    byId("detail-permission").replaceChildren(permissionBadge(user));
    byId("pending-permission-note").hidden = user.enrollment_status !== "pending_face";

    directory.hidden = true;
    details.hidden = false;
    heading.focus();
}

function backToDirectory() {
    const employeeId = selectedUser.employee_id;
    selectedUser = null;
    details.hidden = true;
    byId("record-crumb").hidden = true;
    directory.hidden = false;
    const rowAction = [...rows.querySelectorAll(".view-user")]
        .find((action) => action.dataset.employeeId === employeeId);
    (rowAction ?? search).focus();
}

function renderRows() {
    const query = search.value.trim().toLowerCase();
    const matches = users
        .filter((user) => user.name.toLowerCase().includes(query) || user.employee_id.toLowerCase().includes(query))
        .sort((first, second) => nameOrder.compare(first.name, second.name));
    const fragment = document.createDocumentFragment();

    for (const user of matches) {
        const row = rowTemplate.content.cloneNode(true);
        row.querySelector(".avatar").textContent = initials(user.name);
        row.querySelector(".name").textContent = user.name;
        row.querySelector(".employee-id").textContent = user.employee_id;
        row.querySelector(".enrollment").append(enrollmentBadge(user));
        row.querySelector(".permission").append(permissionBadge(user));
        const action = row.querySelector(".view-user");
        action.setAttribute("aria-label", `View user: ${user.name}`);
        action.dataset.employeeId = user.employee_id;
        action.addEventListener("click", () => showDetails(user));
        fragment.append(row);
    }

    rows.replaceChildren(fragment);
    resultCount.textContent = query
        ? `${matches.length} of ${users.length} users`
        : `${users.length} ${users.length === 1 ? "user" : "users"}`;
    state.hidden = matches.length > 0;
    message.textContent = query ? "No users match your search." : "The directory is empty.";
}

function renderSummary() {
    const enrolledCount = users.filter((user) => user.enrollment_status === "enrolled").length;
    const accessCount = users.filter((user) => user.access_level !== "none").length;
    const pendingCount = users.length - enrolledCount;
    byId("enrolled-count").textContent = enrolledCount;
    byId("access-count").textContent = accessCount;
    byId("no-access-count").textContent = users.length - accessCount;
    const pending = byId("pending-count");
    pending.hidden = pendingCount === 0;
    pending.textContent = `${pendingCount} pending face ${pendingCount === 1 ? "enrollment" : "enrollments"}`;
}

async function loadUsers({ restoreFocus = false } = {}) {
    state.hidden = false;
    message.textContent = "Loading users…";
    retry.hidden = true;
    search.disabled = true;

    try {
        users = await fetchUsers();
    } catch {
        message.textContent = "Couldn't load the user directory. Try again.";
        retry.hidden = false;
        if (restoreFocus) retry.focus();
        return;
    }

    renderSummary();
    search.disabled = false;
    byId("open-enrollment").disabled = false;
    renderRows();
    if (restoreFocus) search.focus();
}

setupEnrollment({
    onOpen() {
        directory.hidden = true;
        byId("crumb-name").textContent = "Enroll user";
        byId("record-crumb").hidden = false;
    },
    onSaved(user) {
        users.push(user);
        search.value = "";
        renderSummary();
        renderRows();
    },
    onClose() {
        byId("record-crumb").hidden = true;
        directory.hidden = false;
        byId("open-enrollment").focus();
    },
    enrollmentBadge,
    permissionBadge,
});

const dialog = byId("user-action");
const cancelAction = byId("cancel-user-action");
const confirmAction = byId("confirm-user-action");
const actionError = byId("user-action-error");
let removing = false;

function openUserAction(remove) {
    removing = remove;
    const { name, employee_id: employeeId, access_level: accessLevel } = selectedUser;
    byId("user-action-title").textContent = remove ? "Remove user?" : "Edit permission";
    byId("user-action-description").textContent = remove
        ? `Remove ${name} (${employeeId}) from the directory?`
        : `${name} · ${employeeId}`;
    byId("permission-field").hidden = remove;
    permission.value = accessLevel;
    confirmAction.textContent = remove ? "Remove user" : "Save permission";
    confirmAction.classList.toggle("remove-confirm", remove);
    actionError.hidden = true;
    dialog.showModal();
}

byId("back").addEventListener("click", backToDirectory);
byId("edit-permission").addEventListener("click", () => openUserAction(false));
byId("remove-user").addEventListener("click", () => openUserAction(true));
cancelAction.addEventListener("click", () => dialog.close());
dialog.addEventListener("cancel", (event) => {
    // Keep dialog open while request active, including when pressing Esc
    if (confirmAction.disabled) event.preventDefault();
});

actionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (confirmAction.disabled) return;

    const { employee_id: employeeId } = selectedUser;
    const accessLevel = permission.value;
    confirmAction.disabled = cancelAction.disabled = permission.disabled = true;
    actionError.hidden = true;
    confirmAction.textContent = removing ? "Removing…" : "Saving…";

    try {
        if (removing) {
            await removeUser(employeeId);
            users = users.filter((user) => user.employee_id !== employeeId);
            dialog.close();
            renderSummary();
            renderRows();
            backToDirectory();
        } else {
            const updated = await changePermission(employeeId, accessLevel);
            users = users.map((user) => user.employee_id === employeeId ? updated : user);
            dialog.close();
            renderSummary();
            renderRows();
            showDetails(updated);
            byId("edit-permission").focus();
        }
    } catch (error) {
        actionError.textContent = error instanceof TypeError
            ? "Couldn't reach the server. Try again."
            : error.message;
        actionError.hidden = false;
    } finally {
        confirmAction.disabled = cancelAction.disabled = permission.disabled = false;
        confirmAction.textContent = removing ? "Remove user" : "Save permission";
        if (dialog.open) confirmAction.focus();
    }
});

search.addEventListener("input", renderRows);
retry.addEventListener("click", () => loadUsers({ restoreFocus: true }));
loadUsers();
