import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccnttypePage } from './accnttype.page';

describe('AccnttypePage', () => {
  let component: AccnttypePage;
  let fixture: ComponentFixture<AccnttypePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AccnttypePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
