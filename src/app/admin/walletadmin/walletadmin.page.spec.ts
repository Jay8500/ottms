import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletadminPage } from './walletadmin.page';

describe('WalletadminPage', () => {
  let component: WalletadminPage;
  let fixture: ComponentFixture<WalletadminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WalletadminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
