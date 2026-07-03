import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsertabPage } from './usertab.page';

describe('UsertabPage', () => {
  let component: UsertabPage;
  let fixture: ComponentFixture<UsertabPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UsertabPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
