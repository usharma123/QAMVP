import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { MockApiService } from '../../services/mock-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class NavbarComponent {
  openMenu: string | null = null;

  constructor(private router: Router, private api: MockApiService) {}

  get userDisplay(): string {
    const user = this.api.getCurrentUser();
    return user ? `${user.username} (${user.role})` : '';
  }

  toggleMenu(menu: string, event: Event): void {
    event.stopPropagation();
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  onDocumentClick(_event: Event): void {
    this.openMenu = null;
  }

  navigate(path: string): void {
    this.openMenu = null;
    this.router.navigate([path]);
  }

  logout(): void {
    this.openMenu = null;
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
