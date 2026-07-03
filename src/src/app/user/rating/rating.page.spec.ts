import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingPage } from './rating.page';

describe('RatingPage', () => {
  let component: RatingPage;
  let fixture: ComponentFixture<RatingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RatingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
