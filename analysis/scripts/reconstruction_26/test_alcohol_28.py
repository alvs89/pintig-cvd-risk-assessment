import unittest
import numpy as np
import pandas as pd
from expand_alcohol_28 import ALLOWED, SIZES, generate

class AlcoholTests(unittest.TestCase):
    def test_abstainers(self):
        d=generate(pd.DataFrame([[0,0]],columns=ALLOWED))
        self.assertEqual(d.iloc[0].tolist(),['none',0])

    def test_beverage_sizes_and_heavy_drinkers(self):
        x=pd.DataFrame([[3,0],[12,1]]*100,columns=ALLOWED);d=generate(x)
        self.assertTrue(d.alcohol_serving_size_ml.gt(0).all())
        self.assertTrue(d.alcohol_serving_size_ml.equals(d.alcohol_beverage_type.map(SIZES)))
        self.assertEqual(set(d.alcohol_beverage_type),set(SIZES)-{'none'})

    def test_contradictions_invalid_and_unknown(self):
        for values in [[0,1],[-1,0],[np.nan,0],[2,np.nan],[2,2],[np.inf,0]]:
            with self.assertRaises(ValueError):generate(pd.DataFrame([values],columns=ALLOWED))

    def test_reproducible_and_does_not_mutate(self):
        x=pd.DataFrame([[2,0],[15,1]]*30,columns=ALLOWED);old=x.copy()
        pd.testing.assert_frame_equal(generate(x),generate(x))
        pd.testing.assert_frame_equal(x,old)
        self.assertFalse(generate(x,1).equals(generate(x,2)))

    def test_forbidden_inputs(self):
        for field in ['event_type','analysis_time_days','outer_fold','participant_id']:
            x=pd.DataFrame([[2,0]],columns=ALLOWED);x[field]=1
            with self.assertRaises(ValueError):generate(x)

if __name__=='__main__':unittest.main()
