import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsermngmntPage } from './usermngmnt.page';

describe('UsermngmntPage', () => {
  let component: UsermngmntPage;
  let fixture: ComponentFixture<UsermngmntPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UsermngmntPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
