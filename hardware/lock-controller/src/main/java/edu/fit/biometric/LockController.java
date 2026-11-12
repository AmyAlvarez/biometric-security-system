package edu.fit.biometric;

/**
 * Receives grant/deny decisions from the backend and controls the physical lock
 * through the Raspberry Pi GPIO pins. (Issue: Control the Lock Using Java)
 * The lock stays closed by default and on any error.
 */
public class LockController {
    public static void main(String[] args) {
        System.out.println("Lock controller starting (lock is CLOSED by default)");
    }
}
