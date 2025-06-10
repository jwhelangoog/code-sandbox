import {Component, HostListener, ElementRef, ViewChild, AfterViewInit} from '@angular/core';
import {CommonModule} from '@angular/common';

interface HistoryEntry {
  expression: string;
  result: string;
  timestamp: Date;
}

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.scss']
})
export class CalculatorComponent implements AfterViewInit {
  @ViewChild('displayPanel') displayPanel!: ElementRef;
  @ViewChild('historyEntries') historyEntries!: ElementRef;
  displayValue: string = '0';
  currentInput: string = '';
  operator: string | null = null;
  firstOperand: number | null = null;
  waitingForSecondOperand: boolean = false;
  private errorState: boolean = false;
  private readonly BASE_FONT_SIZE = 3.5;
  private readonly MIN_FONT_SIZE = 0.5;
  private readonly ERROR_DISPLAY_TIME = 1000;

  // History tracking
  history: HistoryEntry[] = [];
  private inputHistory: string[] = [];
  private operationSequence: string[] = [];
  private lastValidDisplay: string = '0';

  ngAfterViewInit() {
    this.updateDisplay();
  }

  private formatDisplayNumber(num: number): string {
    if (Number.isInteger(num)) {
      return String(num);
    }
    return parseFloat(num.toFixed(10)).toString();
  }

  private updateDisplay(): void {
    if (this.currentInput === '') {
      this.displayValue = (this.waitingForSecondOperand && this.firstOperand !== null)
        ? this.formatDisplayNumber(this.firstOperand)
        : '0';
    } else {
      this.displayValue = this.currentInput;
    }

    if (this.displayPanel) {
      this.displayPanel.nativeElement.textContent = this.displayValue;
      this.scaleTextToFit();
    }
  }

  private scrollToLatestEntry(): void {
    if (this.historyEntries) {
      setTimeout(() => {
        const container = this.historyEntries.nativeElement;
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  private async showError(message: string): Promise<void> {
    this.errorState = true;
    this.displayValue = message;

    if (this.displayPanel) {
      this.displayPanel.nativeElement.textContent = message;
      this.scaleTextToFit();
    }

    this.history.push({
      expression: this.operationSequence.join(''),
      result: message,
      timestamp: new Date()
    });
    this.scrollToLatestEntry();

    try {
      await new Promise(resolve => setTimeout(resolve, this.ERROR_DISPLAY_TIME));

      this.displayValue = this.lastValidDisplay;
      this.currentInput = this.lastValidDisplay;
      this.firstOperand = parseFloat(this.lastValidDisplay);
      this.operator = null;
      this.waitingForSecondOperand = false;
      this.errorState = false;

      this.updateDisplay();
    } catch (error) {
      this.errorState = false;
      this.displayValue = '0';
      this.currentInput = '';
      this.operator = null;
      this.firstOperand = null;
      this.waitingForSecondOperand = false;
      this.updateDisplay();
    }
  }

  private scaleTextToFit(): void {
    const display = this.displayPanel.nativeElement;
    const text = display.textContent;

    if (!text) return;

    display.style.fontSize = `${this.BASE_FONT_SIZE}em`;

    const containerWidth = display.clientWidth - 40;

    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.fontSize = `${this.BASE_FONT_SIZE}em`;
    tempSpan.style.fontFamily = getComputedStyle(display).fontFamily;
    tempSpan.style.fontWeight = getComputedStyle(display).fontWeight;
    tempSpan.textContent = text;
    document.body.appendChild(tempSpan);

    const textWidth = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);

    if (textWidth > containerWidth) {
      const scale = containerWidth / textWidth;
      const newFontSize = Math.max(this.BASE_FONT_SIZE * scale, this.MIN_FONT_SIZE);
      display.style.fontSize = `${newFontSize}em`;
    }
  }

  appendDigit(digit: string): void {
    if (this.errorState) return;

    if (this.waitingForSecondOperand) {
      this.currentInput = digit;
      this.waitingForSecondOperand = false;
      this.inputHistory = [digit];
      this.operationSequence.push(digit);
    } else {
      if (this.operator === null && this.firstOperand !== null && this.currentInput === this.formatDisplayNumber(this.firstOperand)) {
        this.currentInput = digit;
        this.firstOperand = null;
        this.inputHistory = [digit];
        this.operationSequence = [digit];
      } else if (digit === '.' && this.currentInput.includes('.')) {
        return;
      } else if (this.currentInput === '0' && digit !== '.') {
        this.currentInput = digit;
        this.inputHistory = [digit];
        this.operationSequence = [digit];
      } else if (this.currentInput === '-0' && digit !== '.') {
        this.currentInput = '-' + digit;
        this.inputHistory = ['-', digit];
        this.operationSequence = ['-', digit];
      } else {
        if (this.currentInput.length < 16) {
          this.currentInput += digit;
          this.inputHistory.push(digit);
          this.operationSequence.push(digit);
        }
      }
    }
    this.updateDisplay();
  }

  handleBackspace(): void {
    if (this.errorState || this.waitingForSecondOperand) return;

    if (this.inputHistory.length > 0) {
      this.inputHistory.pop();
      this.currentInput = this.inputHistory.length === 0 ? '0' : this.inputHistory.join('');
      this.updateDisplay();
    }
  }

  handleOperator(nextOperator: string): void {
    if (this.errorState) return;

    const inputValue = parseFloat(this.currentInput);

    if (this.operator && this.waitingForSecondOperand) {
      this.operator = nextOperator;
      return;
    }

    let operandToUse: number;
    if (!isNaN(inputValue)) {
      operandToUse = inputValue;
    } else if (this.firstOperand !== null && (this.currentInput === '' || this.currentInput === this.formatDisplayNumber(this.firstOperand))) {
      operandToUse = this.firstOperand;
    } else {
      return;
    }

    if (this.firstOperand === null) {
      this.firstOperand = operandToUse;
    } else if (this.operator) {
      const result = this.performCalculation(this.firstOperand, operandToUse, this.operator);
      if (this.errorState) return;

      this.firstOperand = result;
      this.currentInput = this.formatDisplayNumber(result);
    } else {
      this.firstOperand = operandToUse;
    }

    this.operator = nextOperator;
    this.waitingForSecondOperand = true;
    this.operationSequence.push(` ${nextOperator} `);
    this.updateDisplay();
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
          this.showError("Calc Error");
          return NaN;
        }
        return op1 / op2;
      default:
        this.showError("Calc Error");
        return NaN;
    }
  }

  handleEquals(): void {
    if (this.operator && this.firstOperand !== null) {
      const secondOperand = this.currentInput ? parseFloat(this.currentInput) : this.firstOperand;
      const result = this.performCalculation(this.firstOperand, secondOperand, this.operator);

      if (!isNaN(result)) {
        const formattedResult = this.formatDisplayNumber(result);
        this.displayValue = formattedResult;
        this.currentInput = formattedResult;
        this.firstOperand = result;
        this.operator = null;
        this.waitingForSecondOperand = false;
        this.lastValidDisplay = formattedResult;

        this.history.push({
          expression: this.operationSequence.join(''),
          result: formattedResult,
          timestamp: new Date()
        });
        this.scrollToLatestEntry();
      }

      this.updateDisplay();
    }
  }

  clear(): void {
    // Add history entry if there's a current input or operation
    if (this.currentInput !== '' || this.operator !== null || this.firstOperand !== null) {
      this.history.push({
        expression: 'AC',
        result: '0',
        timestamp: new Date()
      });
      this.scrollToLatestEntry();
    }

    this.displayValue = '0';
    this.currentInput = '';
    this.operator = null;
    this.firstOperand = null;
    this.waitingForSecondOperand = false;
    this.errorState = false;
    this.inputHistory = [];
    this.operationSequence = [];
    this.lastValidDisplay = '0';
    this.updateDisplay();
  }

  clearHistory(): void {
    this.history = [];
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.errorState) return;

    if (/^[0-9]$/.test(event.key)) {
      this.appendDigit(event.key);
    } else if (event.key === '.' || event.key === ',') {
      this.appendDigit('.');
    } else if (event.key === '+') {
      this.handleOperator('+');
    } else if (event.key === '-') {
      this.handleOperator('-');
    } else if (event.key === '*') {
      this.handleOperator('*');
    } else if (event.key === '/') {
      this.handleOperator('/');
    } else if (event.key === 'Enter' || event.key === '=') {
      this.handleEquals();
    } else if (event.key === 'Escape') {
      event.shiftKey ? this.clearHistory() : this.clear();
    } else if (event.key === '!') {
      this.toggleSign();
    } else if (event.key === '%') {
      this.percentage();
    } else if (event.key === 'Backspace') {
      this.handleBackspace();
    }
  }

  toggleSign(): void {
    if (this.errorState) return;

    if (this.waitingForSecondOperand) {
      if (this.firstOperand !== null) {
        this.firstOperand = -this.firstOperand;
        this.currentInput = this.formatDisplayNumber(this.firstOperand);
      }
    } else {
      if (this.currentInput === '0') return;

      if (this.currentInput.startsWith('-')) {
        this.currentInput = this.currentInput.substring(1);
      } else {
        this.currentInput = '-' + this.currentInput;
      }
    }
    this.updateDisplay();
  }

  percentage(): void {
    if (this.errorState) return;

    if (this.waitingForSecondOperand) {
      if (this.firstOperand !== null) {
        this.firstOperand = this.firstOperand / 100;
        this.currentInput = this.formatDisplayNumber(this.firstOperand);
      }
    } else {
      const value = parseFloat(this.currentInput);
      if (!isNaN(value)) {
        this.currentInput = this.formatDisplayNumber(value / 100);
      }
    }
    this.updateDisplay();
  }
}
