import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategorymngmntPage } from './categorymngmnt.page';

describe('CategorymngmntPage', () => {
  let component: CategorymngmntPage;
  let fixture: ComponentFixture<CategorymngmntPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CategorymngmntPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
