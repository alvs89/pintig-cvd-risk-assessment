import unittest
import numpy as np
import pandas as pd
from engineer_27 import INPUTS, engineer, union_years

class EngineeringTests(unittest.TestCase):
    def inputs(self):
        return pd.DataFrame([[50,1,0,20,2,'beer',375],[60,0,1,0,0,'none',0],[35,0,0,0,1,'wine',125],[45,1,0,np.nan,1,'spirits',30]],columns=INPUTS)
    def test_overlap(self):
        self.assertEqual(union_years([(18,25),(20,30)]),12)
        self.assertEqual(union_years([(18,20),(25,27)]),4)
        self.assertEqual(union_years([]),0)
    def test_ethanol_and_smoking(self):
        f,q=engineer(self.inputs())
        self.assertAlmostEqual(f.alcohol_ethanol_g_week.iloc[0],29.5875)
        self.assertEqual(f.alcohol_ethanol_g_week.iloc[1],0)
        self.assertEqual(f.smoking_status.tolist(),['Current','Former','Never','Current'])
        self.assertTrue(np.isnan(f.current_smoking_intensity_cigs_day.iloc[3]))
        self.assertEqual(f.current_smoking_intensity_cigs_day.iloc[1],0)
    def test_reproducibility_and_bounds(self):
        x=self.inputs();f,q=engineer(x);f2,q2=engineer(x)
        pd.testing.assert_frame_equal(f,f2);pd.testing.assert_frame_equal(q,q2)
        self.assertTrue(f.passive_smoking_adult_years.between(0,x.age_years-18).all())
        for _,r in q.iterrows():
            if r.childhood_response==0:self.assertTrue(pd.isna(r.childhood_mother))
            if r.adult_home_response==0:self.assertTrue(pd.isna(r.partner_response))
    def test_invalid_and_leakage_boundary(self):
        x=self.inputs();x.loc[0,'former_smoker']=1
        with self.assertRaises(ValueError):engineer(x)
        for field in ['outer_fold','event_type','analysis_time_days','participant_id']:
            x=self.inputs();x[field]=1
            with self.assertRaises(ValueError):engineer(x)

if __name__=='__main__':unittest.main()
