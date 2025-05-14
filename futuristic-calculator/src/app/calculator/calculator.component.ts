import {Component} from '@angular/core';

@Component({
  selector: 'app-calculator', // This selector is for the CalculatorComponent
  standalone: true,
  templateUrl: './calculator.component.html', // Make sure this HTML file exists
  styleUrls: ['./calculator.component.scss']   // Make sure this SCSS file exists
})
export class CalculatorComponent {
  displayValue: string = '0';
  currentInput: string = '';
  operator: string | null = null;
  firstOperand: number | null = null;
  waitingForSecondOperand: boolean = false;
  private errorState: boolean = false;

  private formatDisplayNumber(num: number): string {
    if (Number.isInteger(num)) {
      return String(num);
    }
    // Limit decimal places and try to handle floating point inaccuracies for display
    return parseFloat(num.toFixed(10)).toString();
  }

  private showError(message: string): void {
    this.displayValue = message;
    this.errorState = true;
    // Current input and operator states are not immediately cleared,
    // allowing the user to see the context of the error.
    // 'clear()' will reset everything.
  }

  updateDisplay(): void {
    if (this.errorState) {
      // displayValue is already set by showError
      return;
    }
    if (this.currentInput === '') {
      // If waiting for the second operand, show the first operand. Otherwise, show '0'.
      this.displayValue = (this.waitingForSecondOperand && this.firstOperand !== null)
        ? this.formatDisplayNumber(this.firstOperand)
        : '0';
    } else {
      this.displayValue = this.currentInput;
    }
  }

  appendDigit(digit: string): void {
    if (this.errorState) return; // Block input if in error state

    // If an operator was just pressed, or after an equals, the next digit starts a new number.
    if (this.waitingForSecondOperand) {
      this.currentInput = digit;
      this.waitingForSecondOperand = false; // We are now entering the second operand
    } else {
      // If currentInput holds the result of a previous calculation (e.g., after '='),
      // and a new digit is pressed, it should start a new number.
      // This state is when `operator` is null and `firstOperand` holds the result.
      if (this.operator === null && this.firstOperand !== null && this.currentInput === this.formatDisplayNumber(this.firstOperand)) {
        this.currentInput = digit;
        this.firstOperand = null; // Start fresh for a new calculation not involving the previous result directly
      } else if (digit === '.' && this.currentInput.includes('.')) {
        return; // Prevent multiple decimals
      } else if (this.currentInput === '0' && digit !== '.') {
        this.currentInput = digit; // Replace initial '0'
      } else if (this.currentInput === '-0' && digit !== '.') { // Handle typing after a negation if implemented
        this.currentInput = '-' + digit;
      } else {
        // Append digit, but prevent excessively long numbers if desired (e.g. by checking length)
        if (this.currentInput.length < 16) { // Arbitrary limit
          this.currentInput += digit;
        }
      }
    }
    this.updateDisplay();
  }

  handleOperator(nextOperator: string): void {
    if (this.errorState) return;

    const inputValue = parseFloat(this.currentInput);

    // If user presses an operator consecutively (e.g. 5 + -), update the operator
    if (this.operator && this.waitingForSecondOperand) {
      this.operator = nextOperator;
      // displayValue should already be showing firstOperand, no need to updateDisplay here
      return;
    }

    let operandToUse: number;
    if (!isNaN(inputValue)) {
      operandToUse = inputValue;
    } else if (this.firstOperand !== null && (this.currentInput === '' || this.currentInput === this.formatDisplayNumber(this.firstOperand))) {
      // This case handles pressing an operator after a result (e.g., 5 = then +)
      // or if currentInput was cleared somehow but firstOperand is valid.
      operandToUse = this.firstOperand;
    } else {
      // Not a valid number to start or continue an operation
      // (e.g. pressed operator with no preceding number and no prior result)
      return;
    }

    if (this.firstOperand === null) {
      // This is the first number in an operation
      this.firstOperand = operandToUse;
    } else if (this.operator) {
      // An operation is pending (e.g., 5 + 3 then *), calculate it
      // operandToUse is the second operand for the pending operation
      const result = this.performCalculation(this.firstOperand, operandToUse, this.operator);
      if (this.errorState) return; // performCalculation might set errorState

      this.firstOperand = result;
      // currentInput should reflect the result of this intermediate calculation
      this.currentInput = this.formatDisplayNumber(result);
    } else {
      // firstOperand exists, but no operator (e.g. after an equals, then an operator is pressed)
      // The current input (operandToUse) becomes the new firstOperand for the new operation.
      // Or, if currentInput was empty, firstOperand (the previous result) is re-used.
      this.firstOperand = operandToUse;
    }

    this.operator = nextOperator;
    this.waitingForSecondOperand = true;
    // Display the first operand (or the intermediate result)
    // currentInput will be reset by the next appendDigit call
    this.updateDisplay(); // Update display to show firstOperand or result before new input
  }

  performCalculation(op1: number, op2: number, currentOp: string): number {
    switch (currentOp) {
      case '+':
        return op1 + op2;
      case '-':
        return op1 - op2;
      case '*':
        return op1 * op2;
      case '/':
        if (op2 === 0) {
          this.showError("Error: Div by 0");
          return NaN;
        }
        return op1 / op2;
      default:
        this.showError("Error: Bad Op");
        return NaN;
    }
  }

  handleEquals(): void {
    if (this.errorState) return;

    const secondOperandValue = parseFloat(this.currentInput);

    if (this.operator === null || this.firstOperand === null || isNaN(secondOperandValue)) {
      // Not enough information (e.g., "5 + =" or just "=" or "abc =")
      // If waitingForSecondOperand is true, it means an operator was pressed,
      // but currentInput might not be a complete second number yet.
      // The isNaN(secondOperandValue) check covers incomplete/invalid second number.
      return;
    }

    const result = this.performCalculation(this.firstOperand, secondOperandValue, this.operator);
    if (this.errorState) return; // performCalculation might set errorState

    this.displayValue = this.formatDisplayNumber(result);
    this.currentInput = this.displayValue; // The result is now the current input
    this.firstOperand = result; // Store result for potential chaining (e.g., if an operator is pressed next)
    this.operator = null;       // Clear operator after equals
    this.waitingForSecondOperand = false; // Not waiting for a second operand for the *completed* operation
  }

  clear(): void {
    this.displayValue = '0';
    this.currentInput = '';
    this.operator = null;
    this.firstOperand = null;
    this.waitingForSecondOperand = false;
    this.errorState = false; // Clear any error state
    this.updateDisplay(); // Ensure display reflects the cleared state
  }

  // You might want to add other functions like:
  // - toggleSign() for +/-
  // - percentage() for %
  // - clearEntry() (CE) to clear only the current input
}
