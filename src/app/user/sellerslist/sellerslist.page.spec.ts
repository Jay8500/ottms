import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SellerslistPage } from './sellerslist.page';

describe('SellerslistPage', () => {
  let component: SellerslistPage;
  let fixture: ComponentFixture<SellerslistPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SellerslistPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
