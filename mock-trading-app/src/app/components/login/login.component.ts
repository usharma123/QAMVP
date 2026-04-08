import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockApiService } from '../../services/mock-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private api: MockApiService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      username: [''],
      password: [''],
    });
  }

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    this.api.login(this.form.value.username, this.form.value.password).subscribe({
      next: (user) => {
        this.loading = false;
        if (user) {
          this.router.navigate(['/dashboard']);
        } else {
          this.error = 'Invalid username or password';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Login failed';
      },
    });
  }
}
