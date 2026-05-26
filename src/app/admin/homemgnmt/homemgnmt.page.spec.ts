import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomemgnmtPage } from './homemgnmt.page';

describe('HomemgnmtPage', () => {
  let component: HomemgnmtPage;
  let fixture: ComponentFixture<HomemgnmtPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomemgnmtPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
