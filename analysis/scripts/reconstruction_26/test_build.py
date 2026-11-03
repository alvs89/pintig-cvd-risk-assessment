"""Semantic tests for missingness, questionnaire encoding, skip logic and leakage boundary."""
import unittest
import numpy as np
import pandas as pd
from build import ALLOWED, CATEGORIES, REGIMES, simulate, derive, hip_mean, medication_binary, stress_binary

class QuestionnaireTests(unittest.TestCase):
    def test_hip_refusal_missing_and_mean(self):
        self.assertEqual(hip_mean(100.0,102.0),101.0)
        self.assertTrue(np.isnan(hip_mean(0,100)))
        self.assertTrue(np.isnan(hip_mean(100,np.nan)))
        self.assertTrue(np.isnan(hip_mean(-1,100)))

    def test_current_not_ever_medication(self):
        for response,expected in [(0,0),(1,1),(2,0)]:
            self.assertEqual(medication_binary(response),expected)
        for missing in [9,np.nan,7]: self.assertTrue(np.isnan(medication_binary(missing)))

    def test_stress_unknown_is_not_negative(self):
        self.assertTrue(np.isnan(stress_binary('No response',CATEGORIES[0],True)))
        self.assertTrue(np.isnan(stress_binary(CATEGORIES[0],'No response',True)))
        self.assertEqual(stress_binary(CATEGORIES[2],'No response',True),1)
        self.assertEqual(stress_binary('No response',CATEGORIES[3],True),1)

    def test_work_skip_and_threshold(self):
        self.assertEqual(stress_binary(CATEGORIES[0],'Not applicable',False),0)
        self.assertEqual(stress_binary(CATEGORIES[1],CATEGORIES[1],True),0)
        self.assertEqual(stress_binary(CATEGORIES[0],CATEGORIES[2],True),1)
        # A stray work response must be ignored when the item is not applicable.
        self.assertEqual(stress_binary(CATEGORIES[0],CATEGORIES[3],False),0)

    def baseline(self):
        return pd.DataFrame([[45,1,95,1,50,1],[68,0,88,0,35,0],[35,1,84,1,70,0]],columns=ALLOWED)

    def test_reproducibility_and_scenarios(self):
        for regime in REGIMES:
            q,x=simulate(self.baseline(),20261101,regime)
            q2,x2=simulate(self.baseline(),20261101,regime)
            pd.testing.assert_frame_equal(q,q2);pd.testing.assert_frame_equal(x,x2)
            self.assertEqual(x.loc[1,'diabetes_medication'],0)
            np.testing.assert_allclose(q.filter(like='typical_day_').sum(axis=1),24)
            self.assertTrue(x.sleep_duration_hours.between(3.5,10.5).all())

    def test_future_data_and_folds_rejected(self):
        for column in ['participant_id','event_type','outer_fold','analysis_time_days','TIMECVD']:
            b=self.baseline();b[column]=1
            with self.assertRaises(ValueError):simulate(b,1,'reference')
        b=self.baseline();b.loc[0,'diabetes']=np.nan
        with self.assertRaises(ValueError):simulate(b,1,'reference')

    def test_sleep_invalid_not_imputed(self):
        q,_=simulate(self.baseline(),1,'reference')
        q['typical_day_sleep_hours']=[-1,25,np.nan]
        self.assertTrue(derive(q).sleep_duration_hours.isna().all())

if __name__=='__main__': unittest.main()
