import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupapprovalsPage } from './groupapprovals.page';

describe('GroupapprovalsPage', () => {
  let component: GroupapprovalsPage;
  let fixture: ComponentFixture<GroupapprovalsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupapprovalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
