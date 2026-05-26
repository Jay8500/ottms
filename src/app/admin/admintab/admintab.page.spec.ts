import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdmintabPage } from './admintab.page';

describe('AdmintabPage', () => {
  let component: AdmintabPage;
  let fixture: ComponentFixture<AdmintabPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdmintabPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
