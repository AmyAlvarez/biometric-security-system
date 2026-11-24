import { enrollUser } from "./api.js";

export function setupEnrollment({ onOpen, onSaved, onClose, enrollmentBadge, permissionBadge }) {
    const byId = (id) => document.getElementById(id);
    const enrollment = byId("enrollment");
    const form = byId("employee-form");
    const steps = [...enrollment.querySelectorAll(".enrollment-steps li")];
    const panels = ["employee-step", "camera-step", "confirmation-step"].map(byId);
    const video = byId("enrollment-video");
    const placeholder = byId("camera-placeholder");
    const cameraStatus = byId("camera-status");
    const start = byId("start-camera");
    const save = byId("save-employee");
    const saveError = byId("save-error");

    let employee;
    let cameraRequest = 0;

    function showStep(index) {
        panels.forEach((panel, position) => {
            panel.hidden = position !== index;
            const step = steps[position];
            step.classList.toggle("complete", position < index);
            if (position === index) {
                step.setAttribute("aria-current", "step");
            } else {
                step.removeAttribute("aria-current");
            }
        });
    }

    function stopCamera() {
        // Invalidate any permission request that has yet to return a stream.
        cameraRequest += 1;
        video.srcObject?.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        video.hidden = true;
        placeholder.hidden = false;
        start.disabled = false;
        cameraStatus.textContent = "";
    }

    byId("open-enrollment").addEventListener("click", () => {
        form.reset();
        saveError.hidden = true;
        showStep(0);
        onOpen();
        enrollment.hidden = false;
        byId("enrollment-title").focus();
    });

    enrollment.querySelectorAll("[data-close-enrollment]").forEach((button) => {
        button.addEventListener("click", () => {
            stopCamera();
            enrollment.hidden = true;
            onClose();
        });
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = form.elements.namedItem("name");
        const id = form.elements.namedItem("employee_id");
        name.value = name.value.trim();
        id.value = id.value.trim();
        if (!form.reportValidity()) return;

        employee = { name: name.value, employee_id: id.value };
        byId("preview-employee").textContent = `${employee.name} · ${employee.employee_id}`;
        saveError.hidden = true;
        showStep(1);
        byId("camera-title").focus();
    });

    byId("edit-employee").addEventListener("click", () => {
        stopCamera();
        showStep(0);
        form.elements.namedItem("name").focus();
    });

    start.addEventListener("click", async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            cameraStatus.textContent = "Camera access is unavailable in this browser. You can still save pending enrollment.";
            return;
        }
        const request = ++cameraRequest;
        start.disabled = true;
        cameraStatus.textContent = "Waiting for camera permission…";
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (request !== cameraRequest) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            video.srcObject = stream;
            video.hidden = false;
            placeholder.hidden = true;
            cameraStatus.textContent = "Camera is on. The preview stays in this browser.";
            stream.getVideoTracks().forEach((track) => {
                track.addEventListener("ended", () => {
                    if (request !== cameraRequest) return;
                    stopCamera();
                    cameraStatus.textContent = "The camera stopped. You can restart it or save pending enrollment.";
                });
            });
        } catch (error) {
            if (request !== cameraRequest) return;
            start.disabled = false;
            cameraStatus.textContent = error.name === "NotAllowedError"
                ? "Camera permission was denied. You can still save pending enrollment."
                : "Couldn't open the camera. You can still save pending enrollment.";
        }
    });

    function setSaving(pending) {
        // Disable Back and Cancel until save settles
        panels[1].querySelectorAll("button").forEach((button) => {
            button.disabled = pending;
        });
        save.textContent = pending ? "Saving…" : "Save pending enrollment";
    }

    save.addEventListener("click", async () => {
        if (save.disabled) return;
        // End local preview before sending the employee details
        stopCamera();
        setSaving(true);
        saveError.hidden = true;
        try {
            const user = await enrollUser(employee);
            onSaved(user);
            byId("saved-name").textContent = user.name;
            byId("saved-id").textContent = user.employee_id;
            byId("saved-status").replaceChildren(enrollmentBadge(user), permissionBadge(user));
            showStep(2);
            byId("confirmation-title").focus();
        } catch (error) {
            saveError.textContent = error instanceof TypeError
                ? "Couldn't reach the server. Your details are still here. Try again."
                : error.message;
            saveError.hidden = false;
        } finally {
            setSaving(false);
        }
    });

    window.addEventListener("pagehide", stopCamera);
}
