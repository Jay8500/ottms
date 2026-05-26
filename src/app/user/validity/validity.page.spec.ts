import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidityPage } from './validity.page';

describe('ValidityPage', () => {
  let component: ValidityPage;
  let fixture: ComponentFixture<ValidityPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidityPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
